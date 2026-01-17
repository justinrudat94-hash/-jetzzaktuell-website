import { adTrackingService } from '../services/adTrackingService';
import { premiumService } from '../services/premiumService';
import { adFreeHoursService } from '../services/adFreeHoursService';

class AdTimingHelper {
  private eventViewCount: number = 0;
  private lastInterstitialTime: number = 0;
  private readonly MIN_TIME_BETWEEN_INTERSTITIALS = 60000;
  private readonly MIN_EVENTS_BETWEEN_INTERSTITIALS = 2;
  private readonly MAX_EVENTS_BETWEEN_INTERSTITIALS = 6;

  async shouldShowBanner(userId: string | null): Promise<boolean> {
    if (!userId) return true;

    const [isPremium, hasAdFreeHours] = await Promise.all([
      premiumService.isPremiumUser(userId),
      adFreeHoursService.isAdFreeActive(userId),
    ]);

    return !isPremium && !hasAdFreeHours;
  }

  async shouldShowInterstitial(userId: string | null): Promise<boolean> {
    if (!userId) {
      return this.checkInterstitialTiming();
    }

    const [isPremium, hasAdFreeHours] = await Promise.all([
      premiumService.isPremiumUser(userId),
      adFreeHoursService.isAdFreeActive(userId),
    ]);

    if (isPremium || hasAdFreeHours) {
      return false;
    }

    return this.checkInterstitialTiming();
  }

  private checkInterstitialTiming(): boolean {
    const now = Date.now();
    const timeSinceLastAd = now - this.lastInterstitialTime;

    if (timeSinceLastAd < this.MIN_TIME_BETWEEN_INTERSTITIALS) {
      return false;
    }

    this.eventViewCount++;

    if (this.eventViewCount < this.MIN_EVENTS_BETWEEN_INTERSTITIALS) {
      return false;
    }

    const randomThreshold =
      Math.floor(
        Math.random() *
          (this.MAX_EVENTS_BETWEEN_INTERSTITIALS - this.MIN_EVENTS_BETWEEN_INTERSTITIALS + 1)
      ) + this.MIN_EVENTS_BETWEEN_INTERSTITIALS;

    if (this.eventViewCount >= randomThreshold) {
      this.lastInterstitialTime = now;
      this.eventViewCount = 0;
      return true;
    }

    return false;
  }

  async trackEventView(): Promise<void> {
    this.eventViewCount++;
  }

  resetEventCount(): void {
    this.eventViewCount = 0;
  }

  async canEarnAdFreeHours(userId: string): Promise<boolean> {
    return await adFreeHoursService.canEarnMoreToday(userId);
  }

  async getRemainingAdFreeAds(userId: string): Promise<number> {
    const stats = await adFreeHoursService.getUserAdFreeStats(userId);
    return stats.daily_remaining_ads;
  }

  async getAdFreeBalance(userId: string): Promise<{
    balance: number;
    balance_display: string;
  }> {
    const stats = await adFreeHoursService.getUserAdFreeStats(userId);
    return {
      balance: stats.balance,
      balance_display: stats.balance_display,
    };
  }

  async consumeAdFreeTime(userId: string, minutes: number): Promise<boolean> {
    const hours = minutes / 60;
    const result = await adFreeHoursService.consumeHours(userId, hours);
    return result.success;
  }

  async startAdFreeSession(userId: string, durationMinutes: number = 30): Promise<boolean> {
    const hours = durationMinutes / 60;
    const balance = await adFreeHoursService.getBalance(userId);

    if (balance < hours) {
      return false;
    }

    return true;
  }

  async shouldShowRewardedAd(userId: string): Promise<boolean> {
    const canEarn = await this.canEarnAdFreeHours(userId);
    const isPremium = await premiumService.isPremiumUser(userId);

    return canEarn && !isPremium;
  }

  getInterstitialStats(): {
    eventCount: number;
    timeSinceLastAd: number;
  } {
    return {
      eventCount: this.eventViewCount,
      timeSinceLastAd: Date.now() - this.lastInterstitialTime,
    };
  }
}

export const adTimingHelper = new AdTimingHelper();
