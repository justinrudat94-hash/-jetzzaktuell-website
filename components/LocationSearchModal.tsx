import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X, MapPin, Search, Check, Target } from 'lucide-react-native';

interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: string, radius: number) => void;
  currentLocation?: string;
  currentRadius?: number;
}

const germanCities = [
  { name: 'München', zip: '80331' },
  { name: 'Berlin', zip: '10115' },
  { name: 'Hamburg', zip: '20095' },
  { name: 'Köln', zip: '50667' },
  { name: 'Frankfurt am Main', zip: '60311' },
  { name: 'Stuttgart', zip: '70173' },
  { name: 'Düsseldorf', zip: '40213' },
  { name: 'Dortmund', zip: '44135' },
  { name: 'Essen', zip: '45127' },
  { name: 'Leipzig', zip: '04109' },
  { name: 'Bremen', zip: '28195' },
  { name: 'Dresden', zip: '01067' },
  { name: 'Hannover', zip: '30159' },
  { name: 'Nürnberg', zip: '90403' },
  { name: 'Duisburg', zip: '47051' },
  { name: 'Bochum', zip: '44787' },
  { name: 'Wuppertal', zip: '42103' },
  { name: 'Bielefeld', zip: '33602' },
  { name: 'Bonn', zip: '53111' },
  { name: 'Münster', zip: '48143' },
  { name: 'Karlsruhe', zip: '76133' },
  { name: 'Mannheim', zip: '68159' },
  { name: 'Augsburg', zip: '86150' },
  { name: 'Wiesbaden', zip: '65183' },
  { name: 'Gelsenkirchen', zip: '45879' },
  { name: 'Mönchengladbach', zip: '41061' },
  { name: 'Braunschweig', zip: '38100' },
  { name: 'Chemnitz', zip: '09111' },
  { name: 'Kiel', zip: '24103' },
  { name: 'Aachen', zip: '52062' },
  { name: 'Magdeburg', zip: '39104' },
  { name: 'Freiburg im Breisgau', zip: '79098' },
  { name: 'Krefeld', zip: '47798' },
  { name: 'Lübeck', zip: '23552' },
  { name: 'Oberhausen', zip: '46045' },
  { name: 'Erfurt', zip: '99084' },
  { name: 'Mainz', zip: '55116' },
  { name: 'Rostock', zip: '18055' },
  { name: 'Kassel', zip: '34117' },
  { name: 'Hagen', zip: '58095' },
  { name: 'Potsdam', zip: '14467' },
  { name: 'Saarbrücken', zip: '66111' },
  { name: 'Hamm', zip: '59065' },
  { name: 'Mülheim an der Ruhr', zip: '45468' },
  { name: 'Ludwigshafen am Rhein', zip: '67059' },
  { name: 'Leverkusen', zip: '51373' },
  { name: 'Oldenburg', zip: '26122' },
  { name: 'Neuss', zip: '41460' },
  { name: 'Solingen', zip: '42651' },
  { name: 'Heidelberg', zip: '69117' },
  { name: 'Herne', zip: '44623' },
  { name: 'Regensburg', zip: '93047' },
  { name: 'Paderborn', zip: '33098' },
  { name: 'Ingolstadt', zip: '85049' },
  { name: 'Offenbach am Main', zip: '63065' },
  { name: 'Fürth', zip: '90762' },
  { name: 'Würzburg', zip: '97070' },
  { name: 'Ulm', zip: '89073' },
  { name: 'Heilbronn', zip: '74072' },
  { name: 'Pforzheim', zip: '75175' },
  { name: 'Wolfsburg', zip: '38440' },
  { name: 'Göttingen', zip: '37073' },
  { name: 'Bottrop', zip: '46236' },
  { name: 'Trier', zip: '54290' },
  { name: 'Recklinghausen', zip: '45657' },
  { name: 'Reutlingen', zip: '72764' },
  { name: 'Bremerhaven', zip: '27568' },
  { name: 'Koblenz', zip: '56068' },
  { name: 'Bergisch Gladbach', zip: '51465' },
  { name: 'Jena', zip: '07743' },
  { name: 'Remscheid', zip: '42853' },
  { name: 'Erlangen', zip: '91052' },
  { name: 'Moers', zip: '47441' },
  { name: 'Siegen', zip: '57072' },
  { name: 'Hildesheim', zip: '31134' },
  { name: 'Salzgitter', zip: '38259' },
];

const radiusOptions = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
];

export default function LocationSearchModal({
  visible,
  onClose,
  onLocationSelect,
  currentLocation = '',
  currentRadius = 20,
}: LocationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);
  const [selectedRadius, setSelectedRadius] = useState(currentRadius);
  const [sliderValue, setSliderValue] = useState(currentRadius);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<typeof germanCities>([]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (text.length > 0) {
      const filtered = germanCities.filter(city =>
        city.name.toLowerCase().includes(text.toLowerCase()) ||
        city.zip.includes(text)
      );
      setAutocompleteResults(filtered.slice(0, 8));
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
      setAutocompleteResults([]);
    }
  };

  const handleAutocompleteSelect = (city: typeof germanCities[0]) => {
    setSelectedLocation(city.name);
    setSearchQuery(city.name);
    setShowAutocomplete(false);
  };

  const filteredCities = germanCities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.zip.includes(searchQuery)
  );

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation, selectedRadius);
      onClose();
    }
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
  };

  const getRadiusLabel = () => {
    return `${selectedRadius} km`;
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    setSelectedRadius(value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ortsauswahl</Text>
          <TouchableOpacity 
            onPress={handleConfirm}
            style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
            disabled={!selectedLocation}
          >
            <Check size={24} color={selectedLocation ? "#10B981" : "#D1D5DB"} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6B7280" />
            <TextInput
              placeholder="Stadt oder PLZ eingeben..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              style={styles.searchInput}
            />
          </View>
          
          {/* Autocomplete Results */}
          {showAutocomplete && autocompleteResults.length > 0 && (
            <View style={styles.autocompleteContainer}>
              <ScrollView 
                style={styles.autocompleteList}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {autocompleteResults.map((city, index) => (
                  <TouchableOpacity
                    key={`${city.name}-${city.zip}`}
                    style={[
                      styles.autocompleteItem,
                      selectedLocation === city.name && styles.autocompleteItemSelected
                    ]}
                    onPress={() => handleAutocompleteSelect(city)}
                  >
                    <MapPin size={16} color="#8B5CF6" />
                    <View style={styles.autocompleteContent}>
                      <Text style={[
                        styles.autocompleteCityName,
                        selectedLocation === city.name && styles.autocompleteTextSelected
                      ]}>
                        {city.name}
                      </Text>
                      <Text style={styles.autocompleteZip}>PLZ: {city.zip}</Text>
                    </View>
                    {selectedLocation === city.name && (
                      <Check size={16} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Location Mode Selection */}
        <View style={styles.locationModeSection}>
          <Text style={styles.locationModeTitle}>Suchbereich wählen</Text>
          <View style={styles.locationModeOptions}>
            <TouchableOpacity
              style={[
                styles.locationModeOption,
                selectedLocation === 'Ganz Deutschland' && styles.locationModeOptionActive,
              ]}
              onPress={() => handleLocationSelect('Ganz Deutschland')}
            >
              <Text style={[
                styles.locationModeOptionText,
                selectedLocation === 'Ganz Deutschland' && styles.locationModeOptionTextActive,
              ]}>
                🇩🇪 Ganz Deutschland
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.locationModeOption,
                selectedLocation === 'Mein Standort' && styles.locationModeOptionActive,
              ]}
              onPress={() => handleLocationSelect('Mein Standort')}
            >
              <Text style={[
                styles.locationModeOptionText,
                selectedLocation === 'Mein Standort' && styles.locationModeOptionTextActive,
              ]}>
                📍 Mein Standort
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Radius Selection */}
        {selectedLocation !== 'Ganz Deutschland' && (
          <View style={styles.radiusSection}>
            <Text style={styles.radiusTitle}>
              Umkreis: {getRadiusLabel()}
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>5km</Text>
              <View style={styles.sliderWrapper}>
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      { width: `${((sliderValue - 5) / (200 - 5)) * 100}%` }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.sliderThumb, 
                      { left: `${((sliderValue - 5) / (200 - 5)) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
              <Text style={styles.sliderLabel}>200km</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.radiusOptions}
              contentContainerStyle={styles.radiusOptionsContent}
            >
              {radiusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radiusOption,
                    selectedRadius === option.value && styles.radiusOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedRadius(option.value);
                    setSliderValue(option.value);
                  }}
                >
                  <Text style={[
                    styles.radiusOptionText,
                    selectedRadius === option.value && styles.radiusOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <MapPin size={48} color="#8B5CF6" />
            <Text style={styles.mapPlaceholderText}>
              Interaktive Karte
            </Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Deutschland mit Umkreis-Anzeige
            </Text>
            {selectedLocation && (
              <View style={styles.selectedLocationIndicator}>
                <View style={styles.locationPin} />
                <Text style={styles.selectedLocationText}>{selectedLocation}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cities List */}
        <ScrollView style={styles.citiesList}>
          <Text style={styles.citiesTitle}>
            {searchQuery.length > 0 ? `Suchergebnisse (${filteredCities.length})` : 'Beliebte Städte'}
          </Text>
          {(searchQuery.length > 0 ? filteredCities : germanCities).map((city, index) => (
            <TouchableOpacity
              key={`${city.name}-${index}`}
              style={[
                styles.cityItem,
                selectedLocation === city.name && styles.cityItemSelected
              ]}
              onPress={() => handleLocationSelect(city.name)}
            >
              <MapPin size={16} color="#6B7280" />
              <View style={styles.cityContent}>
                <Text style={[
                  styles.cityText,
                  selectedLocation === city.name && styles.cityTextSelected
                ]}>
                  {city.name}
                </Text>
                <Text style={styles.cityZip}>PLZ: {city.zip}</Text>
              </View>
              {selectedLocation === city.name && (
                <Check size={16} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  confirmButton: {
    padding: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  autocompleteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autocompleteList: {
    flex: 1,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  autocompleteItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  autocompleteContent: {
    flex: 1,
  },
  autocompleteCityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  autocompleteZip: {
    fontSize: 12,
    color: '#6B7280',
  },
  autocompleteTextSelected: {
    color: '#8B5CF6',
  },
  locationModeSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  locationModeOptions: {
    gap: 8,
  },
  locationModeOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  locationModeOptionActive: {
    backgroundColor: '#8B5CF6',
  },
  locationModeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  locationModeOptionTextActive: {
    color: '#FFFFFF',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  radiusSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radiusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 35,
  },
  sliderWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    marginLeft: -10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    backgroundColor: '#8B5CF6',
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginLeft: -9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  radiusOptions: {
    marginHorizontal: -16,
  },
  radiusOptionsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  radiusOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  radiusOptionActive: {
    backgroundColor: '#8B5CF6',
  },
  radiusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  radiusOptionTextActive: {
    color: '#FFFFFF',
  },
  sliderDisabled: {
    opacity: 0.3,
  },
  sliderFillDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sliderThumbDisabled: {
    backgroundColor: '#D1D5DB',
    borderColor: '#F3F4F6',
  },
  disabledNotice: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  disabledNoticeText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  selectedLocationIndicator: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  locationPin: {
    width: 20,
    height: 20,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    marginBottom: 4,
  },
  selectedLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  citiesList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  citiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  cityContent: {
    flex: 1,
  },
  cityText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  cityTextSelected: {
    fontWeight: '600',
    color: '#8B5CF6',
  },
  cityZip: {
    fontSize: 12,
    color: '#6B7280',
  },
});