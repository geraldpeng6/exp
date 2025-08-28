export interface DayCount { d: number; c: number }
export interface ArticleTop { slug: string; v: number }
export interface RefTop { ref: string; v: number }
export interface UtmTop { src: string; v: number }
export interface ByReferrerDay { d: number; ref: string; c: number }
export interface ClickTop { sel: string; name?: string | null; v: number }

export interface AggregateData {
  totalPv: number;
  totalUv: number;
  byDay: DayCount[];
  byDayUv: DayCount[];
  topArticles: ArticleTop[];
  topReferrers: RefTop[];
  topUtmSource: UtmTop[];
  byReferrerDay: ByReferrerDay[];
  stayBuckets: number[];
  topClicks: ClickTop[];
  scrollDist: number[];
}

export interface AggregateResponse { success: boolean; data: AggregateData }

