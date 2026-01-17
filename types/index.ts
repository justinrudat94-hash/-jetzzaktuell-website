// Core Event Interface
export interface Event {
  id: number | string;
  title: string;
  description: string;
  location: string;
  city?: string;
  address: string;
  time: string;
  date: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  endDate?: string;
  endTime?: string;
  category: string;
  price: string | number | null;
  is_free?: boolean;
  image: string;
  image_url?: string;
  preview_image_url?: string;
  image_urls?: string[];
  attendees: number;
  organizer: string;
  rating?: number;
  reviews?: number;
  tags: string[];
  isLive?: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  latitude?: number;
  longitude?: number;
  creatorId?: string;
  user_id?: string;
  season_special?: string;
  ticket_url?: string;
  external_source?: string;
}

// Favorite Event Interface
export interface FavoriteEvent extends Event {
  addedAt: string;
}

// Location Interface
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Filter Interface
export interface EventFilters {
  category?: string;
  location?: string;
  radius?: number;
  date?: string;
  priceRange?: 'free' | 'paid' | 'all';
  sortBy?: 'date' | 'distance' | 'popularity';
  seasonSpecial?: string;
}

// Share Options
export interface ShareOption {
  name: string;
  icon: any;
  color: string;
  onPress: () => void;
}

// Navigation Types
export type RootStackParamList = {
  '(tabs)': undefined;
  'event/[id]': { id: string };
  'favorites': undefined;
  'create-event': undefined;
  '+not-found': undefined;
};

// KYC Verification Types
export type KYCVerificationStatus = 'not_started' | 'pending' | 'verified' | 'failed';

export interface KYCStatus {
  required: boolean;
  status: KYCVerificationStatus | null;
  verifiedAt: string | null;
  lastAttempt: string | null;
  lifetimeEarnings: number;
}

export interface KYCVerifiedData {
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
  verifiedAt: string | null;
}

export interface VerificationSessionResponse {
  client_secret: string;
  verification_url: string;
  session_id: string;
  status: string;
}

// Profile with KYC Fields
export interface ProfileWithKYC {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  profile_image: string | null;
  stripe_identity_verification_id: string | null;
  kyc_verification_status: KYCVerificationStatus | null;
  kyc_required: boolean;
  kyc_verified_at: string | null;
  kyc_verification_last_attempt: string | null;
  kyc_verified_first_name: string | null;
  kyc_verified_last_name: string | null;
  kyc_verified_dob: string | null;
  kyc_verified_address: string | null;
  lifetime_earnings: number;
}