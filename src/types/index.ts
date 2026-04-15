// ─── User & Profile ───────────────────────────────────────────────────────────

export type TrustTier = 'Member' | 'Connector' | 'Trusted' | 'Founding';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  skill_tags: string[];
  trust_score: number; // 0–100
  trust_tier: TrustTier;
  konnect_points: number;
  completion_rate: number; // 0–1
  response_time_median_hours: number;
  total_completions: number;
  status: UserStatus;
  is_premium: boolean;
  joined_at: string;
  last_active_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

// ─── Circle of Trust ─────────────────────────────────────────────────────────

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  vouched_at: string | null;
  created_at: string;
  profile?: UserProfile; // joined
}

// ─── Shout-Out (Core Feature) ─────────────────────────────────────────────────

export type ShoutUrgency = 'routine' | 'urgent' | 'asap';
export type ShoutComplexity = 'simple_task' | 'project' | 'ongoing';
export type ShoutFormat = 'in_person' | 'remote' | 'async';
export type ShoutStatus =
  | 'draft'
  | 'parsing'
  | 'matching'
  | 'active'
  | 'accepted'
  | 'completed'
  | 'cancelled';

export interface ShoutOut {
  id: string;
  author_id: string;
  raw_text: string | null;
  voice_url: string | null;
  draft_text: string;
  skill_tags: string[];
  urgency: ShoutUrgency;
  complexity: ShoutComplexity;
  format: ShoutFormat;
  ai_confidence: number; // 0–1
  status: ShoutStatus;
  matched_user_ids: string[]; // top 2–3
  accepted_by_id: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  author?: UserProfile; // joined
}

export interface ShoutParseResult {
  skill_tags: string[];
  urgency: ShoutUrgency;
  complexity: ShoutComplexity;
  format: ShoutFormat;
  draft_text: string;
  confidence: number;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  shout_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string | null;
  is_verified: boolean;
  ai_quality_score: number | null; // 0–1
  created_at: string;
  reviewer?: UserProfile; // joined
}

// ─── Konnect Points ───────────────────────────────────────────────────────────

export type PointsEventType =
  | 'completion'
  | 'strong_review'
  | 'referral_completion'
  | 'fast_response'
  | 'streak_bonus'
  | 'spend_priority_match'
  | 'spend_second_degree';

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  event_type: PointsEventType;
  delta: number; // positive = earn, negative = spend
  balance_after: number;
  reference_id: string | null; // shout_id or referral_id
  description: string;
  created_at: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'shout_match'
  | 'shout_accepted'
  | 'shout_completed'
  | 'review_received'
  | 'connection_request'
  | 'connection_accepted'
  | 'points_earned'
  | 'trust_tier_upgrade';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── AI Matching ──────────────────────────────────────────────────────────────

export interface MatchScore {
  user_id: string;
  cosine_similarity: number;
  trust_weight: number;
  final_score: number;
  skill_overlap: string[];
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
    status?: number;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  '(auth)/login': undefined;
  '(auth)/register': undefined;
  '(auth)/forgot-password': undefined;
  '(app)/index': undefined;
  '(app)/profile': { userId?: string };
  '(app)/settings': undefined;
  '(app)/shout/create': undefined;
  '(app)/shout/[id]': { id: string };
  '(app)/connections': undefined;
  '(app)/points': undefined;
  '+not-found': undefined;
};
