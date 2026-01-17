import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Chrome as Home, Video, Search, Plus, Calendar, User, MapPin } from 'lucide-react-native';
import { Colors } from '../../constants';
import { EditModeState } from '../../utils/editModeState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const [showDialog, setShowDialog] = useState(false);
  const { t } = useTranslation();

  const handleTabPress = (e: any) => {
    try {
      if (EditModeState.isEditMode()) {
        e.preventDefault();

        const saveCallback = EditModeState.getSaveCallback();
        const discardCallback = EditModeState.getDiscardCallback();

        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error in tab press handler:', error);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
  };

  const handleDiscard = () => {
    setShowDialog(false);
    const discardCallback = EditModeState.getDiscardCallback();
    if (discardCallback) {
      discardCallback();
    }
  };

  const handleSave = async () => {
    setShowDialog(false);
    const saveCallback = EditModeState.getSaveCallback();

    if (saveCallback) {
      try {
        await saveCallback();
      } catch (error) {
        console.error('Error in save callback:', error);
      }
    }
  };

  return (
    <>
      <ConfirmDialog
        visible={showDialog}
        title="Ungespeicherte Änderungen"
        message="Möchtest du die Änderungen speichern oder verwerfen?"
        onCancel={handleCancel}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.white,
          tabBarInactiveTintColor: Colors.gray300,
          tabBarStyle: {
            backgroundColor: Colors.gray800,
            borderTopWidth: 0,
            paddingTop: 8,
            paddingBottom: 8,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarItemStyle: {
            paddingHorizontal: 2,
          },
        }}
        screenListeners={{
          tabPress: handleTabPress,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: t('tabs.live'),
          tabBarIcon: ({ size, color }) => (
            <Video size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('tabs.events'),
          tabBarIcon: ({ size, color }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          tabBarIcon: ({ size, color }) => (
            <Plus size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}