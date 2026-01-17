'use client';
// Support Ticket Chat Interface - Live Version - Updated 2026-01-16
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface TicketResponse {
  id: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  user_id: string;
}

interface OptimisticMessage {
  id: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  isPending: boolean;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  closing_message: string | null;
  user_id: string | null;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function TicketPage() {
  const params = useParams();
  const token = params?.token as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      loadTicket();
    }
  }, [token]);

  useEffect(() => {
    if (ticket?.id) {
      const cleanup = subscribeToResponses();
      return cleanup;
    }
  }, [ticket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [responses, optimisticMessages]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('access_token', token)
        .single();

      if (ticketError) throw ticketError;
      if (!ticketData) throw new Error('Ticket nicht gefunden');

      setTicket(ticketData);

      const { data: responsesData, error: responsesError } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketData.id)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (err: any) {
      console.error('Error loading ticket:', err);
      setError(err.message || 'Fehler beim Laden des Tickets');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToResponses = () => {
    if (!ticket?.id) return;

    const channel = supabase
      .channel(`ticket_responses_${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_responses',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          const newResponse = payload.new as TicketResponse;

          // Nur hinzufügen wenn noch nicht vorhanden
          setResponses((prev) => {
            const exists = prev.some((r) => r.id === newResponse.id);
            if (exists) return prev;
            return [...prev, newResponse];
          });

          // Entferne optimistische Nachricht wenn vorhanden
          setOptimisticMessages((prev) => prev.filter((m) => !m.isPending));
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReopenTicket = async () => {
    if (!ticket || reopening) return;

    try {
      setReopening(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({
          status: 'open',
          waiting_for: 'admin',
          closed_at: null,
          closing_message: null,
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      setTicket((prev) => prev ? {
        ...prev,
        status: 'open',
        closed_at: null,
        closing_message: null,
      } : null);

      showToast('Ticket wurde wieder geöffnet', 'success');
    } catch (err: any) {
      console.error('Error reopening ticket:', err);
      setError('Fehler beim Öffnen des Tickets');
      showToast('Ticket konnte nicht geöffnet werden', 'error');
    } finally {
      setReopening(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket || sending) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      message: messageText,
      is_admin_response: false,
      created_at: new Date().toISOString(),
      isPending: true,
    };

    try {
      setSending(true);
      setError(null);
      setNewMessage('');

      setOptimisticMessages((prev) => [...prev, optimisticMessage]);

      const { data: insertedData, error: insertError } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: ticket.id,
          user_id: ticket.user_id,
          message: messageText,
          is_admin_response: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('Message inserted successfully:', insertedData);

      // Fallback: Entferne optimistische Nachricht nach 3 Sekunden falls kein Realtime-Update kommt
      setTimeout(() => {
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId));

        // Wenn die echte Nachricht noch nicht in responses ist, neu laden
        setResponses((currentResponses) => {
          const exists = currentResponses.some((r) => r.id === insertedData.id);
          if (!exists) {
            return [...currentResponses, insertedData as TicketResponse];
          }
          return currentResponses;
        });
      }, 3000);

      showToast('Nachricht gesendet', 'success');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError('Fehler beim Senden der Nachricht');
      showToast('Nachricht konnte nicht gesendet werden', 'error');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-amber-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      waiting: 'Wartet auf Antwort',
      resolved: 'Gelöst',
      closed: 'Geschlossen',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ticket wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket nicht gefunden</h1>
          <p className="text-gray-600">{error || 'Das Ticket konnte nicht geladen werden.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-fade-in ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(ticket.status)}`}>
                {getStatusLabel(ticket.status)}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-600 space-x-4">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {ticket.category}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Erstellt am {new Date(ticket.created_at).toLocaleDateString('de-DE')}
              </span>
              <span className="text-xs text-gray-400">
                #{ticket.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Closed Banner */}
        {ticket.status === 'closed' && ticket.closing_message && (
          <div className="mx-4 mt-4 sm:mx-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">Ticket geschlossen</p>
                <p className="text-sm text-green-700 mt-1">{ticket.closing_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="px-4 py-6 sm:px-6 space-y-4 pb-32">
          {/* Initial message */}
          <div className="flex justify-end">
            <div className="max-w-lg">
              <div className="flex items-center justify-end space-x-2 mb-1">
                <span className="text-xs font-medium text-gray-700">Du</span>
                <span className="text-xs text-gray-500">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="bg-indigo-100 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Responses */}
          {responses.map((response) => (
            <div key={response.id} className={`flex ${response.is_admin_response ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-lg">
                <div className={`flex items-center space-x-2 mb-1 ${response.is_admin_response ? 'justify-start' : 'justify-end'}`}>
                  <span className="text-xs font-medium text-gray-700">
                    {response.is_admin_response ? 'Support-Team' : 'Du'}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(response.created_at)}</span>
                </div>
                <div className={`rounded-lg p-4 ${response.is_admin_response ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-gray-900'}`}>
                  <p className="whitespace-pre-wrap">{response.message}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Optimistic Messages */}
          {optimisticMessages.map((message) => (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-lg">
                <div className="flex items-center justify-end space-x-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">Du</span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird gesendet...
                  </span>
                </div>
                <div className="bg-indigo-100 rounded-lg p-4 opacity-70">
                  <p className="text-gray-900 whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {ticket.status !== 'closed' ? (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={sending ? "Nachricht wird gesendet..." : "Deine Nachricht..."}
                    rows={3}
                    disabled={sending}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{newMessage.length}/2000</p>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors h-[52px] flex-shrink-0"
                >
                  {sending ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
              <div className="flex flex-col items-center space-y-3">
                <p className="text-sm text-gray-700 text-center">
                  Dieses Ticket wurde geschlossen. Du kannst es jederzeit wieder öffnen.
                </p>
                <button
                  onClick={handleReopenTicket}
                  disabled={reopening}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {reopening ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Öffne Ticket...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Ticket wieder öffnen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
