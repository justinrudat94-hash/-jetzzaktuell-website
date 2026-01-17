import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Calendar, MapPin, Clock, ChevronDown, ChevronLeft, ChevronRight, Sparkles, Shield, AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, SEASON_SPECIALS, EVENT_CATEGORIES } from '../../constants';
import CalendarModal from '../../components/CalendarModal';
import TimePickerModal from '../../components/TimePickerModal';
import { router, useFocusEffect } from 'expo-router';
import { createEvent } from '../../services/eventService';
import { aiModerationService } from '../../services/aiModerationService';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';

export default function CreateScreen() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [isPastDue, setIsPastDue] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // ScrollView refs for each step
  const scrollViewRef = useRef(null);
  
  // Step 1 State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [seasonSpecial, setSeasonSpecial] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [durationType, setDurationType] = useState('Einzeltermin'); // 'Einzeltermin' or 'Zeitraum'
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState('start'); // 'start', 'end', 'single'
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState('start'); // 'start' or 'end'

  // Recurring Event State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('weekly');
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState('never'); // 'never', 'date', 'count'
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState('10');

  // Step 2 State
  const [description, setDescription] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [ageRating, setAgeRating] = useState('');
  const [showAgeRatingDropdown, setShowAgeRatingDropdown] = useState(false);
  const [lineup, setLineup] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  
  // Step 3 State
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [ticketsRequired, setTicketsRequired] = useState(false);
  const [ticketLink, setTicketLink] = useState('');
  const [idRequired, setIdRequired] = useState(false);
  const [vouchersAvailable, setVouchersAvailable] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [sponsors, setSponsors] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Check subscription status on mount and focus
  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      checkSubscriptionStatus();
    }, [user])
  );

  const checkSubscriptionStatus = async () => {
    if (!user) {
      setCheckingSubscription(false);
      setIsPastDue(false);
      return;
    }

    try {
      setCheckingSubscription(true);

      // Check if user has a past_due subscription
      const { data: subscription, error } = await supabase
        .from('premium_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Block event creation if subscription is past_due
      if (subscription?.status === 'past_due') {
        setIsPastDue(true);
      } else {
        setIsPastDue(false);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsPastDue(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Reset form when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Create screen focused - resetting form');
      resetForm();
    }, [])
  );


  // Reset scroll to top when step changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentStep]);
  
  // Autocomplete data
  const titleSuggestions = [
    'Sommerfest', 'Sommerparty', 'Winterfest', 'Geburtstag', 'Hochzeit',
    'Konzert', 'Festival', 'Flohmarkt', 'Stadtfest', 'Sportfest'
  ];
  
  const categories = EVENT_CATEGORIES;
  
  const citySuggestions = [
    { postcode: '04420', city: 'Markranstädt' },
    { postcode: '04109', city: 'Leipzig' },
    { postcode: '80331', city: 'München' },
    { postcode: '10115', city: 'Berlin' },
    { postcode: '20095', city: 'Hamburg' }
  ];

  const ageRatingOptions = [
    'ab 0',
    'ab 6',
    'ab 12',
    'ab 16',
    'ab 18'
  ];

  const weekdayOptions = [
    { label: 'Mo', value: 'Mo' },
    { label: 'Di', value: 'Di' },
    { label: 'Mi', value: 'Mi' },
    { label: 'Do', value: 'Do' },
    { label: 'Fr', value: 'Fr' },
    { label: 'Sa', value: 'Sa' },
    { label: 'So', value: 'So' }
  ];
  const stepTitles = [
    'Grundlagen',
    'Details', 
    'Preise & Optionen',
    'Zusammenfassung'
  ];

  const validateStep1 = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Bitte einen Titel eingeben';
    }

    if (!category) {
      newErrors.category = 'Bitte eine Kategorie auswählen';
    }

    if (!postcode.trim() || !city.trim()) {
      newErrors.location = 'Bitte PLZ und Stadt eingeben';
    }

    if (!street.trim()) {
      newErrors.street = 'Bitte eine Straße eingeben';
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      newErrors.datetime = 'Bitte Datum und Uhrzeit auswählen';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    
    if (!isFree && !price.trim()) {
      newErrors.price = 'Bitte einen Preis eingeben';
    }
    
    if (ticketsRequired && !ticketLink.trim()) {
      newErrors.ticketLink = 'Bitte einen Ticket-Link eingeben';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!description.trim()) {
      newErrors.description = 'Bitte eine Beschreibung eingeben';
    }

    if (!previewImage) {
      newErrors.previewImage = 'Bitte ein Vorschaubild auswählen';
    }

    if (!ageRating) {
      newErrors.ageRating = 'Bitte eine Altersfreigabe auswählen';
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = 'Bitte eine gültige E-Mail-Adresse eingeben';
    }

    if (contactPhone) {
      const cleanedPhone = contactPhone.trim();
      if (cleanedPhone.length < 5 || !/^[\d\s\+\-\(\)\/]+$/.test(cleanedPhone)) {
        newErrors.contactPhone = 'Bitte eine gültige Telefonnummer eingeben';
      }
    }

    if (contactWebsite && !/^https?:\/\/.+\..+/.test(contactWebsite)) {
      newErrors.contactWebsite = 'Bitte eine gültige Website-URL eingeben (mit http:// oder https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        return;
      }
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        return;
      }
    } else if (currentStep === 3) {
      if (!validateStep3()) {
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleDateSelect = (date) => {
    if (calendarMode === 'single') {
      setStartDate(date);
      setEndDate(date); // Same date for Einzeltermin
    } else if (calendarMode === 'start') {
      setStartDate(date);
      // If end date is before start date, reset it
      if (endDate && new Date(endDate) < new Date(date)) {
        setEndDate('');
      }
    } else if (calendarMode === 'end') {
      // Only allow end date if it's after or equal to start date
      if (startDate && new Date(date) >= new Date(startDate)) {
        setEndDate(date);
      } else {
        Alert.alert('Fehler', 'Das Enddatum muss nach dem Startdatum liegen.');
        return;
      }
    } else if (calendarMode === 'recurrence_end') {
      if (startDate && new Date(date) >= new Date(startDate)) {
        setRecurrenceEndDate(date);
      } else {
        Alert.alert('Fehler', 'Das Enddatum muss nach dem Startdatum liegen.');
        return;
      }
    }
    handleDateTimeChange();
    setShowCalendar(false);
  };

  const openCalendar = (mode) => {
    setCalendarMode(mode);
    setShowCalendar(true);
  };

  const validateTimeOrder = (start, end) => {
    if (!start || !end) return true; // Skip validation if times are empty
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  };

  const handleTimeSelect = (time) => {
    const timeType = timePickerMode;
    
    if (timeType === 'start') {
      setStartTime(time);
      // Validate time order if end time exists
      if (endTime && !validateTimeOrder(time, endTime)) {
        Alert.alert('Fehler', 'Die Startzeit muss vor der Endzeit liegen.');
        return;
      }
    } else if (timeType === 'end') {
      // Validate time order
      if (startTime && !validateTimeOrder(startTime, time)) {
        Alert.alert('Fehler', 'Die Endzeit muss nach der Startzeit liegen.');
        return;
      }
      setEndTime(time);
    }
    handleDateTimeChange();
  };

  const openTimePicker = (mode) => {
    setTimePickerMode(mode);
    setShowTimePicker(true);
  };

  const handleTitleChange = (text) => {
    setTitle(text);
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: null }));
    }
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: null }));
    }
  };

  const handleSeasonSpecialSelect = (selected) => {
    setSeasonSpecial(selected);
  };

  const handleLocationChange = () => {
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: null }));
    }
  };

  const handleDateTimeChange = () => {
    if (errors.datetime) {
      setErrors(prev => ({ ...prev, datetime: null }));
    }
  };

  const handleMapSelect = () => {
    Alert.alert('Karte', 'Kartenauswahl würde hier geöffnet werden');
  };

  const handleDescriptionChange = (text) => {
    if (text.length <= 500) {
      setDescription(text);
      if (errors.description) {
        setErrors(prev => ({ ...prev, description: null }));
      }
    }
  };

  const handlePreviewImageSelect = () => {
    // Simulate image selection
    const mockImage = {
      id: Date.now(),
      uri: 'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg',
      name: 'preview-image.jpg'
    };
    setPreviewImage(mockImage);
    if (errors.previewImage) {
      setErrors(prev => ({ ...prev, previewImage: null }));
    }
    if (errors.previewImage) {
      setErrors(prev => ({ ...prev, previewImage: null }));
    }
    Alert.alert('Vorschaubild', 'Demo-Bild wurde ausgewählt');
  };

  const handleImagesUpload = () => {
    if (uploadedImages.length >= 5) {
      Alert.alert('Maximum erreicht', 'Sie können maximal 5 Bilder hochladen');
      return;
    }
    
    const mockImage = {
      id: Date.now(),
      uri: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg',
      name: `image-${uploadedImages.length + 1}.jpg`
    };
    setUploadedImages(prev => [...prev, mockImage]);
    Alert.alert('Bild hinzugefügt', `${uploadedImages.length + 1}/5 Bilder hochgeladen`);
  };

  const handleVideoUpload = () => {
    if (uploadedVideo) {
      Alert.alert('Video bereits vorhanden', 'Sie können nur ein Video hochladen');
      return;
    }
    
    const mockVideo = {
      id: Date.now(),
      uri: 'mock-video.mp4',
      name: 'event-video.mp4',
      duration: '2:30'
    };
    setUploadedVideo(mockVideo);
    Alert.alert('Video hochgeladen', 'Demo-Video wurde hinzugefügt');
  };

  const handleRemoveImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleRemoveVideo = () => {
    setUploadedVideo(null);
  };

  const handleRemovePreviewImage = () => {
    setPreviewImage(null);
  };

  const handleAgeRatingSelect = (rating) => {
    setAgeRating(rating);
    setShowAgeRatingDropdown(false);
    if (errors.ageRating) {
      setErrors(prev => ({ ...prev, ageRating: null }));
    }
  };

  const handlePriceToggle = (free) => {
    setIsFree(free);
    if (free) {
      setPrice('');
      if (errors.price) {
        setErrors(prev => ({ ...prev, price: null }));
      }
    }
  };

  const handlePriceChange = (text) => {
    // Only allow numbers and decimal point
    const numericValue = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setPrice(numericValue);
    if (errors.price) {
      setErrors(prev => ({ ...prev, price: null }));
    }
  };

  const handleTicketsToggle = (required) => {
    setTicketsRequired(required);
    if (!required) {
      setTicketLink('');
      if (errors.ticketLink) {
        setErrors(prev => ({ ...prev, ticketLink: null }));
      }
    }
  };

  const handleTicketLinkChange = (text) => {
    setTicketLink(text);
    if (errors.ticketLink) {
      setErrors(prev => ({ ...prev, ticketLink: null }));
    }
  };

  const handleWeekdayToggle = (day) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day]);
    }
  };

  const getNextOccurrences = () => {
    if (!startDate || !isRecurring) return [];

    const dates = [];
    const start = new Date(startDate);
    let current = new Date(start);
    let count = 0;
    const maxCount = recurrenceEndType === 'count' ? parseInt(recurrenceCount || '10') : 100;
    const endDate = recurrenceEndType === 'date' && recurrenceEndDate ? new Date(recurrenceEndDate) : null;

    while (count < Math.min(maxCount, 5)) {
      if (endDate && current > endDate) break;

      if (recurrencePattern === 'daily') {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
        count++;
      } else if (recurrencePattern === 'weekly') {
        const dayOfWeek = current.getDay();
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        const currentDayName = dayNames[dayOfWeek];

        if (selectedWeekdays.includes(currentDayName) || count === 0) {
          dates.push(new Date(current));
          count++;
        }
        current.setDate(current.getDate() + 1);
      } else if (recurrencePattern === 'monthly') {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
        count++;
      } else if (recurrencePattern === 'yearly') {
        dates.push(new Date(current));
        current.setFullYear(current.getFullYear() + 1);
        count++;
      }
    }

    return dates;
  };

  const resetForm = () => {
    setCurrentStep(1);
    setTitle('');
    setCategory('');
    setSeasonSpecial('');
    setPostcode('');
    setCity('');
    setStreet('');
    setDurationType('Einzeltermin');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setIsRecurring(false);
    setRecurrencePattern('weekly');
    setSelectedWeekdays([]);
    setRecurrenceEndType('never');
    setRecurrenceEndDate('');
    setRecurrenceCount('10');
    setDescription('');
    setPreviewImage(null);
    setUploadedImages([]);
    setUploadedVideo(null);
    setAgeRating('');
    setLineup([]);
    setAdditionalInfo('');
    setContactEmail('');
    setContactPhone('');
    setContactWebsite('');
    setIsFree(true);
    setPrice('');
    setTicketsRequired(false);
    setTicketLink('');
    setIdRequired(false);
    setVouchersAvailable(false);
    setAgbAccepted(false);
    setSponsors('');
    setErrors({});
  };

  const handleCreateEvent = async () => {
    console.log('=== FERTIGSTELLEN BUTTON GEKLICKT ===');
    console.log('AGB akzeptiert:', agbAccepted);

    if (!agbAccepted) {
      console.log('FEHLER: AGBs nicht akzeptiert');
      setErrors({ ...errors, agb: 'Bitte AGBs akzeptieren' });
      Alert.alert('Fehler', 'Bitte akzeptieren Sie die AGBs');
      return;
    }

    console.log('Erstelle Event ohne KI-Analyse (OpenAI Key fehlt)...');
    await proceedWithEventCreation();
  };

  const proceedWithEventCreation = async () => {
    console.log('Starte Event-Erstellung...');
    setIsCreating(true);

    try {
      const eventData = {
        title,
        description,
        category,
        season_special: seasonSpecial || undefined,
        postcode,
        city,
        street,
        durationType,
        startDate,
        startTime,
        endDate,
        endTime,
        previewImageUrl: previewImage?.uri,
        imageUrls: uploadedImages.map(img => img.uri),
        videoUrl: uploadedVideo?.uri,
        ageRating,
        isFree,
        price: !isFree ? price : undefined,
        ticketsRequired,
        ticketLink: ticketsRequired ? ticketLink : undefined,
        idRequired,
        vouchersAvailable,
        sponsors,
        lineup: lineup.length > 0 ? lineup : undefined,
        additionalInfo: additionalInfo.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactWebsite: contactWebsite.trim() || undefined,
      };

      console.log('Rufe createEvent auf mit Daten:', eventData);
      const createdEvent = await createEvent(eventData);
      console.log('✅ EVENT ERFOLGREICH ERSTELLT!', createdEvent);

      setIsCreating(false);

      // Erfolg - Reset und Navigate
      resetForm();

      Alert.alert(
        'Erfolg!',
        'Dein Event wurde erfolgreich erstellt!',
        [{
          text: 'OK',
          onPress: () => {
            router.replace('/(tabs)/events');
          }
        }]
      );

    } catch (error: any) {
      console.error('❌ FEHLER beim Event erstellen:', error);
      setIsCreating(false);

      const errorMessage = error?.message || 'Das Event konnte nicht erstellt werden. Bitte versuchen Sie es erneut.';
      Alert.alert('Fehler', errorMessage);
    }
  };

  const handleAgbToggle = () => {
    setAgbAccepted(!agbAccepted);
    if (errors.agb) {
      setErrors(prev => ({ ...prev, agb: null }));
    }
  };

  const formatEventSummary = () => {
    const eventDate = durationType === 'Einzeltermin'
      ? (startDate ? new Date(startDate).toLocaleDateString('de-DE') : '')
      : `${startDate ? new Date(startDate).toLocaleDateString('de-DE') : ''} - ${endDate ? new Date(endDate).toLocaleDateString('de-DE') : ''}`;
    
    const eventTime = durationType === 'Einzeltermin'
      ? `${startTime || ''} - ${endTime || ''}`
      : `${startTime || ''} - ${endTime || ''}`;
    
    return {
      eventDate,
      eventTime,
      location: [postcode, city, street].filter(Boolean).join(', ') || 'Nicht angegeben',
      priceText: isFree ? 'Kostenlos' : `${price || '0'} €`,
    };
  };

  const renderStep1 = () => (
    <ScrollView ref={scrollViewRef} style={styles.stepScrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Grundeinstellungen</Text>
        
        {/* Titel */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Titel *</Text>
          <TextInput
            style={[styles.textInput, errors.title && styles.inputError]}
            placeholder="z.B. Sommerfest im Park"
            value={title}
            onChangeText={handleTitleChange}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          
          {/* Title Suggestions */}
          {title.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {titleSuggestions
                .filter(suggestion => 
                  suggestion.toLowerCase().includes(title.toLowerCase()) && 
                  suggestion.toLowerCase() !== title.toLowerCase()
                )
                .slice(0, 3)
                .map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => setTitle(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* Kategorie */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Kategorie *</Text>
          <TextInput
            style={[styles.textInput, errors.category && styles.inputError]}
            placeholder="z.B. Party, Konzert, Festival..."
            value={category}
            onChangeText={handleCategorySelect}
          />
          
          {/* Category Suggestions */}
          {category.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {categories
                .filter(cat => 
                  cat.toLowerCase().includes(category.toLowerCase()) && 
                  cat.toLowerCase() !== category.toLowerCase()
                )
                .slice(0, 5)
                .map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleCategorySelect(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
          
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        {/* Season Special */}
        <View style={styles.inputGroup}>
          <View style={styles.seasonHeader}>
            <Sparkles size={18} color={Colors.accent} />
            <Text style={styles.inputLabel}>Saison Spezial (optional)</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="z.B. Weihnachten, Silvester, Ostern..."
            value={seasonSpecial}
            onChangeText={handleSeasonSpecialSelect}
          />

          {/* Season Special Suggestions */}
          {seasonSpecial.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {SEASON_SPECIALS
                .filter(season =>
                  season.toLowerCase().includes(seasonSpecial.toLowerCase()) &&
                  season.toLowerCase() !== seasonSpecial.toLowerCase()
                )
                .slice(0, 5)
                .map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSeasonSpecialSelect(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* Ort */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ort *</Text>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.textInput, styles.postcodeInput, errors.location && styles.inputError]}
              placeholder="PLZ"
              value={postcode}
              onChangeText={(text) => {
                setPostcode(text);
                handleLocationChange();
              }}
              keyboardType="numeric"
              maxLength={5}
            />
            <TextInput
              style={[styles.textInput, styles.cityInput, errors.location && styles.inputError]}
              placeholder="Stadt"
              value={city}
              onChangeText={(text) => {
                setCity(text);
                handleLocationChange();
              }}
            />
          </View>
          
          <TextInput
            style={[styles.textInput, errors.street && styles.inputError]}
            placeholder="Straße *"
            value={street}
            onChangeText={(text) => {
              setStreet(text);
              if (errors.street) {
                setErrors(prev => ({ ...prev, street: null }));
              }
            }}
          />

          <TouchableOpacity style={styles.mapButton} onPress={handleMapSelect}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.mapButtonText}>Auf Karte auswählen</Text>
          </TouchableOpacity>

          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
        </View>

        {/* Event-Dauer */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Event-Dauer *</Text>
          
          {/* Duration Type Selection */}
          <View style={styles.durationTypeContainer}>
            <TouchableOpacity
              style={[
                styles.durationTypeButton,
                durationType === 'Einzeltermin' && styles.durationTypeButtonActive
              ]}
              onPress={() => setDurationType('Einzeltermin')}
            >
              <Text style={[
                styles.durationTypeText,
                durationType === 'Einzeltermin' && styles.durationTypeTextActive
              ]}>
                Einzeltermin
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.durationTypeButton,
                durationType === 'Zeitraum' && styles.durationTypeButtonActive
              ]}
              onPress={() => setDurationType('Zeitraum')}
            >
              <Text style={[
                styles.durationTypeText,
                durationType === 'Zeitraum' && styles.durationTypeTextActive
              ]}>
                Zeitraum
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Date/Time Pickers */}
          <View style={styles.dateTimeContainer}>
            {durationType === 'Einzeltermin' ? (
              <>
                <Text style={styles.dateTimeLabel}>Datum</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openCalendar('single')}
                  >
                    <Calendar size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !startDate && styles.placeholderText]}>
                      {startDate ? new Date(startDate).toLocaleDateString('de-DE') : 'Datum'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.dateTimeLabel}>Uhrzeit</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openTimePicker('start')}
                  >
                    <Clock size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !startTime && styles.placeholderText]}>
                      {startTime || 'Von'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openTimePicker('end')}
                  >
                    <Clock size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !endTime && styles.placeholderText]}>
                      {endTime || 'Bis'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.dateTimeLabel}>Start</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openCalendar('start')}
                  >
                    <Calendar size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !startDate && styles.placeholderText]}>
                      {startDate ? new Date(startDate).toLocaleDateString('de-DE') : 'Datum'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openTimePicker('start')}
                  >
                    <Clock size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !startTime && styles.placeholderText]}>
                      {startTime || 'Uhrzeit'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.dateTimeLabel}>Ende</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openCalendar('end')}
                  >
                    <Calendar size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !endDate && styles.placeholderText]}>
                      {endDate ? new Date(endDate).toLocaleDateString('de-DE') : 'Datum'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, errors.datetime && styles.inputError]}
                    onPress={() => openTimePicker('end')}
                  >
                    <Clock size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !endTime && styles.placeholderText]}>
                      {endTime || 'Uhrzeit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {errors.datetime && <Text style={styles.errorText}>{errors.datetime}</Text>}
        </View>

        {/* Recurring Event */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
              {isRecurring && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Dieses Event wiederholt sich</Text>
          </TouchableOpacity>

          {isRecurring && (
            <View style={styles.recurringContainer}>
              {/* Recurrence Pattern */}
              <Text style={styles.recurringLabel}>Wiederholungs-Muster</Text>
              <View style={styles.recurrencePatternContainer}>
                {['daily', 'weekly', 'monthly', 'yearly'].map((pattern) => (
                  <TouchableOpacity
                    key={pattern}
                    style={[
                      styles.patternButton,
                      recurrencePattern === pattern && styles.patternButtonActive
                    ]}
                    onPress={() => setRecurrencePattern(pattern)}
                  >
                    <Text style={[
                      styles.patternButtonText,
                      recurrencePattern === pattern && styles.patternButtonTextActive
                    ]}>
                      {pattern === 'daily' && 'Täglich'}
                      {pattern === 'weekly' && 'Wöchentlich'}
                      {pattern === 'monthly' && 'Monatlich'}
                      {pattern === 'yearly' && 'Jährlich'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Weekday Selection for Weekly */}
              {recurrencePattern === 'weekly' && (
                <View style={styles.weekdaysContainer}>
                  <Text style={styles.recurringLabel}>An welchen Tagen?</Text>
                  <View style={styles.weekdaysRow}>
                    {weekdayOptions.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.weekdayButton,
                          selectedWeekdays.includes(day.value) && styles.weekdayButtonActive
                        ]}
                        onPress={() => handleWeekdayToggle(day.value)}
                      >
                        <Text style={[
                          styles.weekdayButtonText,
                          selectedWeekdays.includes(day.value) && styles.weekdayButtonTextActive
                        ]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* End Type */}
              <Text style={styles.recurringLabel}>Ende der Wiederholung</Text>
              <View style={styles.endTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.endTypeButton,
                    recurrenceEndType === 'never' && styles.endTypeButtonActive
                  ]}
                  onPress={() => setRecurrenceEndType('never')}
                >
                  <View style={styles.radioButton}>
                    {recurrenceEndType === 'never' && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.endTypeText}>Endet nie</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.endTypeButton,
                    recurrenceEndType === 'date' && styles.endTypeButtonActive
                  ]}
                  onPress={() => setRecurrenceEndType('date')}
                >
                  <View style={styles.radioButton}>
                    {recurrenceEndType === 'date' && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.endTypeText}>Endet am:</Text>
                </TouchableOpacity>

                {recurrenceEndType === 'date' && (
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => {
                      setCalendarMode('recurrence_end');
                      setShowCalendar(true);
                    }}
                  >
                    <Calendar size={16} color={Colors.gray500} />
                    <Text style={[styles.dateTimeButtonText, !recurrenceEndDate && styles.placeholderText]}>
                      {recurrenceEndDate ? new Date(recurrenceEndDate).toLocaleDateString('de-DE') : 'Datum'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.endTypeButton,
                    recurrenceEndType === 'count' && styles.endTypeButtonActive
                  ]}
                  onPress={() => setRecurrenceEndType('count')}
                >
                  <View style={styles.radioButton}>
                    {recurrenceEndType === 'count' && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.endTypeText}>Nach</Text>
                </TouchableOpacity>

                {recurrenceEndType === 'count' && (
                  <View style={styles.countInputContainer}>
                    <TextInput
                      style={styles.countInput}
                      value={recurrenceCount}
                      onChangeText={setRecurrenceCount}
                      keyboardType="numeric"
                    />
                    <Text style={styles.countLabel}>Wiederholungen</Text>
                  </View>
                )}
              </View>

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Nächste 5 Termine:</Text>
                {getNextOccurrences().map((date, index) => (
                  <Text key={index} style={styles.previewDate}>
                    • {date.toLocaleDateString('de-DE')} {startTime || ''}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepScrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Details</Text>
        
        {/* Beschreibung */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Beschreibung *</Text>
          <TextInput
            style={[styles.textAreaInput, errors.description && styles.inputError]}
            placeholder="Beschreiben Sie Ihr Event ausführlich..."
            value={description}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={6}
            maxLength={500}
            textAlignVertical="top"
          />
          <View style={styles.characterCounter}>
            <Text style={[
              styles.characterCountText,
              description.length >= 450 && styles.characterCountWarning,
              description.length >= 500 && styles.characterCountError
            ]}>
              {description.length} / 500 Zeichen
            </Text>
          </View>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Vorschaubild */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vorschaubild *</Text>
          {previewImage ? (
            <View style={styles.previewImageContainer}>
              <Image source={{ uri: previewImage.uri }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={handleRemovePreviewImage}
              >
                <Text style={styles.removeImageButtonText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.imageFileName}>{previewImage.name}</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.uploadButton, errors.previewImage && styles.inputError]}
              onPress={handlePreviewImageSelect}
            >
              <Text style={styles.uploadButtonIcon}>📷</Text>
              <Text style={styles.uploadButtonText}>Vorschaubild auswählen</Text>
              <Text style={styles.uploadButtonSubtext}>Max. 1 Bild</Text>
            </TouchableOpacity>
          )}
          {errors.previewImage && <Text style={styles.errorText}>{errors.previewImage}</Text>}
        </View>

        {/* Bilder hochladen */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bilder hochladen (optional)</Text>
          <TouchableOpacity 
            style={[
              styles.uploadButton,
              uploadedImages.length >= 5 && styles.uploadButtonDisabled
            ]}
            onPress={handleImagesUpload}
            disabled={uploadedImages.length >= 5}
          >
            <Text style={styles.uploadButtonIcon}>🖼️</Text>
            <Text style={styles.uploadButtonText}>
              {uploadedImages.length >= 5 ? 'Maximum erreicht' : 'Bilder hinzufügen'}
            </Text>
            <Text style={styles.uploadButtonSubtext}>
              {uploadedImages.length}/5 Bilder
            </Text>
          </TouchableOpacity>
          
          {uploadedImages.length > 0 && (
            <View style={styles.uploadedImagesContainer}>
              {uploadedImages.map((image) => (
                <View key={image.id} style={styles.uploadedImageItem}>
                  <Image source={{ uri: image.uri }} style={styles.uploadedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(image.id)}
                  >
                    <Text style={styles.removeImageButtonText}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.uploadedImageName}>{image.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Video hochladen */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Video hochladen (optional)</Text>
          {uploadedVideo ? (
            <View style={styles.uploadedVideoContainer}>
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoIcon}>🎥</Text>
                <Text style={styles.videoFileName}>{uploadedVideo.name}</Text>
                <Text style={styles.videoDuration}>{uploadedVideo.duration}</Text>
              </View>
              <TouchableOpacity 
                style={styles.removeVideoButton}
                onPress={handleRemoveVideo}
              >
                <Text style={styles.removeVideoButtonText}>Video entfernen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleVideoUpload}
            >
              <Text style={styles.uploadButtonIcon}>🎬</Text>
              <Text style={styles.uploadButtonText}>Video auswählen</Text>
              <Text style={styles.uploadButtonSubtext}>Max. 1 Video</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Jugendschutz / Altersfreigabe */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Jugendschutz / Altersfreigabe *</Text>
          <TouchableOpacity
            style={[styles.dropdownButton, errors.ageRating && styles.inputError]}
            onPress={() => setShowAgeRatingDropdown(!showAgeRatingDropdown)}
          >
            <Text style={[styles.dropdownText, !ageRating && styles.placeholderText]}>
              {ageRating || 'Altersfreigabe auswählen'}
            </Text>
            <ChevronDown size={20} color={Colors.gray500} />
          </TouchableOpacity>
          
          {showAgeRatingDropdown && (
            <View style={styles.dropdownMenu}>
              {ageRatingOptions.map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.dropdownItem,
                    ageRating === rating && styles.dropdownItemSelected
                  ]}
                  onPress={() => handleAgeRatingSelect(rating)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    ageRating === rating && styles.dropdownItemTextSelected
                  ]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.ageRating && <Text style={styles.errorText}>{errors.ageRating}</Text>}
        </View>

        {/* Line-up / Programm */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>🎤 Line-up / Programm (optional)</Text>
          {lineup.map((item, index) => (
            <View key={index} style={styles.lineupItem}>
              <View style={styles.lineupHeader}>
                <Text style={styles.lineupNumber}>{index + 1}</Text>
                <TouchableOpacity
                  style={styles.removeLineupButton}
                  onPress={() => setLineup(lineup.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeLineupButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Name (z.B. DJ Max Mustermann)"
                value={item.name}
                onChangeText={(text) => {
                  const newLineup = [...lineup];
                  newLineup[index].name = text;
                  setLineup(newLineup);
                }}
              />
              <View style={styles.lineupTimeRow}>
                <TextInput
                  style={[styles.textInput, styles.lineupTimeInput]}
                  placeholder="Von (z.B. 20:00)"
                  value={item.startTime}
                  onChangeText={(text) => {
                    const newLineup = [...lineup];
                    newLineup[index].startTime = text;
                    setLineup(newLineup);
                  }}
                />
                <Text style={styles.lineupTimeSeparator}>–</Text>
                <TextInput
                  style={[styles.textInput, styles.lineupTimeInput]}
                  placeholder="Bis (z.B. 22:00)"
                  value={item.endTime}
                  onChangeText={(text) => {
                    const newLineup = [...lineup];
                    newLineup[index].endTime = text;
                    setLineup(newLineup);
                  }}
                />
              </View>
              <TextInput
                style={[styles.textInput, styles.lineupDescription]}
                placeholder="Kurze Beschreibung (optional)"
                value={item.description}
                onChangeText={(text) => {
                  const newLineup = [...lineup];
                  newLineup[index].description = text;
                  setLineup(newLineup);
                }}
                multiline
                numberOfLines={2}
              />
            </View>
          ))}
          <TouchableOpacity
            style={styles.addLineupButton}
            onPress={() => setLineup([...lineup, { name: '', startTime: '', endTime: '', description: '' }])}
          >
            <Text style={styles.addLineupButtonText}>➕ Programmpunkt hinzufügen</Text>
          </TouchableOpacity>
        </View>

        {/* Zusätzliche Infos */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ℹ️ Zusätzliche Infos (optional)</Text>
          <TextInput
            style={[styles.textAreaInput, styles.additionalInfoInput]}
            placeholder="Dresscode, Mitbringen, Parkplätze ..."
            value={additionalInfo}
            onChangeText={(text) => {
              if (text.length <= 300) {
                setAdditionalInfo(text);
              }
            }}
            multiline
            numberOfLines={4}
            maxLength={300}
            textAlignVertical="top"
          />
          <View style={styles.characterCounter}>
            <Text style={[
              styles.characterCountText,
              additionalInfo.length >= 270 && styles.characterCountWarning,
              additionalInfo.length >= 300 && styles.characterCountError
            ]}>
              {additionalInfo.length} / 300 Zeichen
            </Text>
          </View>
        </View>

        {/* Kontaktinformationen */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>📞 Kontaktinformationen (optional)</Text>
          <TextInput
            style={[styles.textInput, errors.contactEmail && styles.inputError]}
            placeholder="E-Mail (z.B. info@event.de)"
            value={contactEmail}
            onChangeText={(text) => {
              setContactEmail(text);
              if (errors.contactEmail) {
                setErrors(prev => ({ ...prev, contactEmail: null }));
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.contactEmail && <Text style={styles.errorText}>{errors.contactEmail}</Text>}

          <TextInput
            style={[styles.textInput, styles.contactPhoneInput, errors.contactPhone && styles.inputError]}
            placeholder="Telefonnummer (z.B. +49 123 456789)"
            value={contactPhone}
            onChangeText={(text) => {
              setContactPhone(text);
              if (errors.contactPhone) {
                setErrors(prev => ({ ...prev, contactPhone: null }));
              }
            }}
            keyboardType="phone-pad"
          />
          {errors.contactPhone && <Text style={styles.errorText}>{errors.contactPhone}</Text>}

          <TextInput
            style={[styles.textInput, styles.contactPhoneInput, errors.contactWebsite && styles.inputError]}
            placeholder="Website (z.B. https://www.event.de)"
            value={contactWebsite}
            onChangeText={(text) => {
              setContactWebsite(text);
              if (errors.contactWebsite) {
                setErrors(prev => ({ ...prev, contactWebsite: null }));
              }
            }}
            keyboardType="url"
            autoCapitalize="none"
          />
          {errors.contactWebsite && <Text style={styles.errorText}>{errors.contactWebsite}</Text>}
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView ref={scrollViewRef} style={styles.stepScrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Preis & Optionen</Text>
        
        {/* Preis Toggle */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preis</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                isFree && styles.toggleButtonActive
              ]}
              onPress={() => handlePriceToggle(true)}
            >
              <Text style={[
                styles.toggleButtonText,
                isFree && styles.toggleButtonTextActive
              ]}>
                Kostenlos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !isFree && styles.toggleButtonActive
              ]}
              onPress={() => handlePriceToggle(false)}
            >
              <Text style={[
                styles.toggleButtonText,
                !isFree && styles.toggleButtonTextActive
              ]}>
                Kostenpflichtig
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Price Input */}
          {!isFree && (
            <View style={styles.priceInputContainer}>
              <TextInput
                style={[styles.textInput, styles.priceInput, errors.price && styles.inputError]}
                placeholder="0,00"
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
              />
              <Text style={styles.priceUnit}>€</Text>
            </View>
          )}
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        {/* Tickets erforderlich */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleTicketsToggle(!ticketsRequired)}
          >
            <View style={[styles.checkbox, ticketsRequired && styles.checkboxChecked]}>
              {ticketsRequired && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Tickets erforderlich</Text>
          </TouchableOpacity>
          
          {/* Ticket Link Input */}
          {ticketsRequired && (
            <TextInput
              style={[styles.textInput, styles.ticketLinkInput, errors.ticketLink && styles.inputError]}
              placeholder="https://tickets.example.com"
              value={ticketLink}
              onChangeText={handleTicketLinkChange}
              keyboardType="url"
            />
          )}
          {errors.ticketLink && <Text style={styles.errorText}>{errors.ticketLink}</Text>}
        </View>

        {/* Ausweis erforderlich */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIdRequired(!idRequired)}
          >
            <View style={[styles.checkbox, idRequired && styles.checkboxChecked]}>
              {idRequired && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Ausweis erforderlich</Text>
          </TouchableOpacity>
        </View>

        {/* Gutscheine verfügbar */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setVouchersAvailable(!vouchersAvailable)}
          >
            <View style={[styles.checkbox, vouchersAvailable && styles.checkboxChecked]}>
              {vouchersAvailable && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Gutscheine verfügbar</Text>
          </TouchableOpacity>
        </View>

        {/* Sponsoren / Partner */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sponsoren / Partner (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="z.B. Stadtwerke München, Café Central..."
            value={sponsors}
            onChangeText={setSponsors}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderStep4 = () => {
    const summary = formatEventSummary();
    
    return (
      <ScrollView ref={scrollViewRef} style={styles.stepScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Zusammenfassung</Text>
          <Text style={styles.summarySubtitle}>Überprüfen Sie Ihre Angaben vor der Veröffentlichung</Text>
          
          {/* Grunddaten */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>📋 Grunddaten</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Titel:</Text>
                <Text style={styles.summaryValue}>{title || 'Nicht angegeben'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kategorie:</Text>
                <Text style={styles.summaryValue}>{category || 'Nicht angegeben'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ort:</Text>
                <Text style={styles.summaryValue}>{summary.location}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Datum:</Text>
                <Text style={styles.summaryValue}>{summary.eventDate || 'Nicht angegeben'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Uhrzeit:</Text>
                <Text style={styles.summaryValue}>{summary.eventTime || 'Nicht angegeben'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Dauer:</Text>
                <Text style={styles.summaryValue}>{durationType}</Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>📝 Details</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Beschreibung:</Text>
                <Text style={styles.summaryValueMultiline}>
                  {description || 'Keine Beschreibung angegeben'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vorschaubild:</Text>
                <Text style={styles.summaryValue}>
                  {previewImage ? '✅ Hochgeladen' : '❌ Nicht vorhanden'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Zusätzliche Bilder:</Text>
                <Text style={styles.summaryValue}>
                  {uploadedImages.length > 0 ? `${uploadedImages.length} Bild(er)` : 'Keine'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Video:</Text>
                <Text style={styles.summaryValue}>
                  {uploadedVideo ? '✅ Hochgeladen' : 'Kein Video'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Altersfreigabe:</Text>
                <Text style={styles.summaryValue}>{ageRating || 'Nicht angegeben'}</Text>
              </View>
              {lineup.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Line-up:</Text>
                  <Text style={styles.summaryValue}>{lineup.length} Programmpunkt(e)</Text>
                </View>
              )}
              {additionalInfo && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Zusätzliche Infos:</Text>
                  <Text style={styles.summaryValueMultiline}>{additionalInfo}</Text>
                </View>
              )}
              {contactEmail && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>E-Mail:</Text>
                  <Text style={styles.summaryValue}>{contactEmail}</Text>
                </View>
              )}
              {contactPhone && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Telefon:</Text>
                  <Text style={styles.summaryValue}>{contactPhone}</Text>
                </View>
              )}
              {contactWebsite && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Website:</Text>
                  <Text style={styles.summaryValueLink}>{contactWebsite}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Preis & Optionen */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>💰 Preis & Optionen</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Preis:</Text>
                <Text style={[styles.summaryValue, styles.priceHighlight]}>
                  {summary.priceText}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tickets erforderlich:</Text>
                <Text style={styles.summaryValue}>
                  {ticketsRequired ? '✅ Ja' : '❌ Nein'}
                </Text>
              </View>
              {ticketsRequired && ticketLink && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ticket-Link:</Text>
                  <Text style={styles.summaryValueLink}>{ticketLink}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ausweis erforderlich:</Text>
                <Text style={styles.summaryValue}>
                  {idRequired ? '✅ Ja' : '❌ Nein'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gutscheine verfügbar:</Text>
                <Text style={styles.summaryValue}>
                  {vouchersAvailable ? '✅ Ja' : '❌ Nein'}
                </Text>
              </View>
              {sponsors && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sponsoren/Partner:</Text>
                  <Text style={styles.summaryValueMultiline}>{sponsors}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Vorschaubild anzeigen */}
          {previewImage && (
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>🖼️ Vorschaubild</Text>
              <View style={styles.summaryImageContainer}>
                <Image source={{ uri: previewImage.uri }} style={styles.summaryImage} />
              </View>
            </View>
          )}

          {/* Hinweis */}
          <View style={styles.summaryNotice}>
            <View style={styles.summaryNoticeHeader}>
              <Shield size={20} color={Colors.primary} />
              <Text style={styles.summaryNoticeTitle}>KI-gestützte Qualitätsprüfung</Text>
            </View>
            <Text style={styles.summaryNoticeText}>
              Dein Event wird automatisch von unserer KI auf Qualität und Spam geprüft.
              Events mit hohem Risiko werden vor der Veröffentlichung manuell überprüft.
            </Text>
          </View>

          {/* AGB Checkbox */}
          <View style={styles.agbSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={handleAgbToggle}
            >
              <View style={[styles.checkbox, agbAccepted && styles.checkboxChecked]}>
                {agbAccepted && <Text style={styles.checkboxIcon}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Ich akzeptiere die AGBs</Text>
            </TouchableOpacity>
            {errors.agb && <Text style={styles.errorText}>{errors.agb}</Text>}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  // If checking subscription, show loading
  if (checkingSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Überprüfe Abo-Status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If past_due, show blockade
  if (isPastDue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockadeContainer}>
          <AlertTriangle size={64} color={Colors.error} />
          <Text style={styles.blockadeTitle}>Event-Erstellung gesperrt</Text>
          <Text style={styles.blockadeMessage}>
            Ihre letzte Zahlung ist fehlgeschlagen. Bitte begleichen Sie Ihre ausstehende Rechnung, um wieder Events erstellen zu können.
          </Text>
          <TouchableOpacity
            style={styles.blockadeButton}
            onPress={() => router.push('/payment-required')}
          >
            <Text style={styles.blockadeButtonText}>Zahlung begleichen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Schritt {currentStep} von {totalSteps}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.stepName}>{stepTitles[currentStep - 1]}</Text>
      </View>

      {/* Step Content */}
      <View style={styles.content}>
        {renderStepContent()}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep < totalSteps ? (
          <>
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.backButton,
                currentStep === 1 && styles.navButtonDisabled
              ]}
              onPress={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft size={20} color={currentStep === 1 ? Colors.gray400 : Colors.gray700} />
              <Text style={[
                styles.navButtonText,
                styles.backButtonText,
                currentStep === 1 && styles.navButtonTextDisabled
              ]}>
                Zurück
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.nextButton
              ]}
              onPress={handleNext}
            >
              <Text style={[
                styles.navButtonText,
                styles.nextButtonText
              ]}>
                Weiter
              </Text>
              <ChevronRight size={20} color={Colors.white} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.backButton
              ]}
              onPress={handleBack}
            >
              <ChevronLeft size={20} color={Colors.gray700} />
              <Text style={[
                styles.navButtonText,
                styles.backButtonText
              ]}>
                Zurück
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.finalizeButton,
                isCreating && styles.navButtonDisabled
              ]}
              onPress={() => {
                console.log('🔵 FERTIGSTELLEN/SPEICHERN BUTTON WURDE GEDRÜCKT');
                handleCreateEvent();
              }}
              disabled={isCreating}
            >
              {isCreating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={styles.loadingText}>
                    Erstelle Event...
                  </Text>
                </View>
              ) : (
                <View style={styles.finalizeButtonContent}>
                  <Shield size={20} color={Colors.white} />
                  <Text style={[
                    styles.navButtonText,
                    styles.finalizeButtonText
                  ]}>
                    Mit KI prüfen & erstellen
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onDateSelect={handleDateSelect}
        selectedDate={calendarMode === 'single' ? startDate : (calendarMode === 'start' ? startDate : endDate)}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onTimeSelect={handleTimeSelect}
        selectedTime={timePickerMode === 'start' ? startTime : endTime}
        title={timePickerMode === 'start' ? 'Startzeit auswählen' : 'Endzeit auswählen'}
        selectedDate={durationType === 'Einzeltermin' ? startDate : (timePickerMode === 'start' ? startDate : endDate)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  progressContainer: {
    backgroundColor: Colors.gray800,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  editModeTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    padding: Spacing.sm,
    position: 'absolute',
    right: 0,
    top: -Spacing.sm,
  },
  progressText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray300,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.massive,
  },
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  suggestionsContainer: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  suggestionText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
  },
  dropdownButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  placeholderText: {
    color: Colors.gray500,
  },
  locationRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  postcodeInput: {
    flex: 1,
  },
  cityInput: {
    flex: 2,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  mapButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  durationTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  durationTypeButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  durationTypeButtonActive: {
    backgroundColor: Colors.primary,
  },
  durationTypeText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  durationTypeTextActive: {
    color: Colors.white,
  },
  dateTimeContainer: {
    gap: Spacing.md,
  },
  dateTimeLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateTimeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  navButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 100,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backButton: {
    backgroundColor: Colors.gray100,
  },
  nextButton: {
    backgroundColor: Colors.primary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  backButtonText: {
    color: Colors.gray700,
  },
  nextButtonText: {
    color: Colors.white,
  },
  navButtonTextDisabled: {
    color: Colors.gray400,
  },
  summarySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  summarySection: {
    marginBottom: Spacing.xl,
  },
  summarySectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
    width: 120,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    flex: 1,
  },
  summaryValueMultiline: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    flex: 1,
    lineHeight: 20,
  },
  summaryValueLink: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    flex: 1,
    textDecorationLine: 'underline',
  },
  priceHighlight: {
    fontWeight: FontWeights.bold,
    color: Colors.secondary,
    fontSize: FontSizes.lg,
  },
  summaryImageContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  summaryImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  summaryNotice: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.lg,
  },
  summaryNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryNoticeTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  summaryNoticeText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  aiWarningSection: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    marginTop: Spacing.lg,
  },
  aiWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  aiWarningTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.warning,
  },
  aiWarningText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  aiWarningPatterns: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  finalizeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  textAreaInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.gray800,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCounter: {
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  characterCountText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  characterCountWarning: {
    color: Colors.warning,
  },
  characterCountError: {
    color: Colors.error,
  },
  uploadButton: {
    backgroundColor: Colors.gray50,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonIcon: {
    fontSize: 32,
  },
  uploadButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  uploadButtonSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  previewImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: FontWeights.bold,
  },
  imageFileName: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  uploadedImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  uploadedImageItem: {
    width: '30%',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 80,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  uploadedImageName: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    marginTop: 4,
    textAlign: 'center',
  },
  uploadedVideoContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  videoPlaceholder: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  videoIcon: {
    fontSize: 32,
  },
  videoFileName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  videoDuration: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  removeVideoButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  removeVideoButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  dropdownMenu: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  toggleButtonTextActive: {
    color: Colors.white,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priceInput: {
    flex: 1,
    textAlign: 'right',
  },
  priceUnit: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  checkboxLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    fontWeight: FontWeights.medium,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxIcon: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  checkboxLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    flex: 1,
  },
  ticketLinkInput: {
    marginTop: Spacing.sm,
  },
  recurringSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  recurrencePatternButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  patternButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  patternButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  patternButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  patternButtonTextActive: {
    color: Colors.white,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  weekdayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  weekdayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekdayButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  weekdayButtonTextActive: {
    color: Colors.white,
  },
  endOptionsContainer: {
    marginTop: Spacing.lg,
  },
  endOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  endOptionButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  endOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endOptionRadioActive: {
    borderColor: Colors.primary,
  },
  endOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  endOptionText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    fontWeight: FontWeights.medium,
  },
  endOptionTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  endDateDetails: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.xxl,
  },
  countInputContainer: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countInput: {
    flex: 1,
    maxWidth: 100,
  },
  countLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  previewContainer: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  previewTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  previewDatesList: {
    gap: Spacing.sm,
  },
  previewDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewDateBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  previewDateText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  agbSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  finalizeButton: {
    backgroundColor: Colors.secondary,
    flex: 1,
    maxWidth: '60%',
  },
  finalizeButtonText: {
    color: Colors.white,
  },
  lineupItem: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  lineupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  lineupNumber: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  removeLineupButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeLineupButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: FontWeights.bold,
  },
  lineupTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  lineupTimeInput: {
    flex: 1,
  },
  lineupTimeSeparator: {
    fontSize: FontSizes.lg,
    color: Colors.gray600,
    fontWeight: FontWeights.semibold,
  },
  lineupDescription: {
    marginTop: Spacing.md,
    minHeight: 60,
  },
  addLineupButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  addLineupButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  additionalInfoInput: {
    minHeight: 100,
  },
  contactPhoneInput: {
    marginTop: Spacing.md,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  blockadeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  blockadeTitle: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  blockadeMessage: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  blockadeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  blockadeButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});