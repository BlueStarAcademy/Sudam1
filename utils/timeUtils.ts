const KST_OFFSET = 9 * 60 * 60 * 1000;

export type SeasonInfo = {
    year: number;
    season: 1 | 2 | 3 | 4;
    name: string; // e.g., '25-1시즌'
};

export const getKSTDate = (date: Date | number = Date.now()): Date => {
    const utc = typeof date === 'number' ? date : date.getTime();
    return new Date(utc + KST_OFFSET);
};

// KST 시간의 요일, 시, 분을 가져오는 헬퍼 함수들
export const getKSTDay = (date: Date | number = Date.now()): number => {
    const kstDate = getKSTDate(date);
    // getKSTDate는 UTC+9 시간을 UTC로 변환한 Date 객체를 반환하므로
    // UTC 메서드를 사용하여 KST의 날짜/시간 정보를 얻을 수 있습니다
    return kstDate.getUTCDay();
};

export const getKSTHours = (date: Date | number = Date.now()): number => {
    const kstDate = getKSTDate(date);
    return kstDate.getUTCHours();
};

export const getKSTMinutes = (date: Date | number = Date.now()): number => {
    const kstDate = getKSTDate(date);
    return kstDate.getUTCMinutes();
};

export const getKSTDate_UTC = (date: Date | number = Date.now()): number => {
    const kstDate = getKSTDate(date);
    return kstDate.getUTCDate();
};

export const getKSTMonth = (date: Date | number = Date.now()): number => {
    const kstDate = getKSTDate(date);
    return kstDate.getUTCMonth();
};

export const getKSTFullYear = (date: Date | number = Date.now()): number => {
    const kstDate = getKSTDate(date);
    return kstDate.getUTCFullYear();
};

export const isSameDayKST = (ts1: number | undefined, ts2: number): boolean => {
    if (!ts1 || ts1 === 0) return false;
    const d1 = getKSTDate(ts1);
    const d2 = getKSTDate(ts2);
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
           d1.getUTCMonth() === d2.getUTCMonth() &&
           d1.getUTCDate() === d2.getUTCDate();
};

export const isDifferentDayKST = (ts1: number | undefined, ts2: number): boolean => {
    if (!ts1 || ts1 === 0) return true;
    return !isSameDayKST(ts1, ts2);
};

export const isDifferentWeekKST = (ts1: number | undefined, ts2: number): boolean => {
    if (!ts1 || ts1 === 0) return true; // Treat no previous update as a new week

    const d1 = getKSTDate(ts1);
    const d2 = getKSTDate(ts2);
    
    // If years are different, it's definitely a different week
    if (d1.getUTCFullYear() !== d2.getUTCFullYear()) {
        return true;
    }

    // Calculate the date of the Monday for each date
    const day1 = d1.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diff1 = d1.getUTCDate() - day1 + (day1 === 0 ? -6 : 1); // Adjust for Sunday
    const monday1 = new Date(d1);
    monday1.setUTCDate(diff1);
    monday1.setUTCHours(0, 0, 0, 0);

    const day2 = d2.getUTCDay();
    const diff2 = d2.getUTCDate() - day2 + (day2 === 0 ? -6 : 1);
    const monday2 = new Date(d2);
    monday2.setUTCDate(diff2);
    monday2.setUTCHours(0, 0, 0, 0);

    return monday1.getTime() !== monday2.getTime();
};

export const isDifferentMonthKST = (ts1: number | undefined, ts2: number): boolean => {
    if (!ts1 || ts1 === 0) return true;
    const d1 = getKSTDate(ts1);
    const d2 = getKSTDate(ts2);

    return d1.getUTCFullYear() !== d2.getUTCFullYear() || d1.getUTCMonth() !== d2.getUTCMonth();
};


export const getCurrentSeason = (date: Date | number = Date.now()): SeasonInfo => {
    const d = getKSTDate(date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0-11
    let season: 1 | 2 | 3 | 4;

    if (month < 3) season = 1;      // Jan, Feb, Mar (Month 0, 1, 2)
    else if (month < 6) season = 2; // Apr, May, Jun (Month 3, 4, 5)
    else if (month < 9) season = 3; // Jul, Aug, Sep (Month 6, 7, 8)
    else season = 4;                // Oct, Nov, Dec (Month 9, 10, 11)
    
    const shortYear = year.toString().slice(-2);
    return { year, season, name: `${shortYear}-${season}시즌` };
};

export const getPreviousSeason = (date: Date | number = Date.now()): SeasonInfo => {
    const d = getKSTDate(date);
    const currentYear = d.getUTCFullYear();
    const currentMonth = d.getUTCMonth();
    
    let prevYear = currentYear;
    let prevSeason: 1 | 2 | 3 | 4;

    if (currentMonth < 3) { // Q1 -> prev year Q4
        prevSeason = 4;
        prevYear -= 1;
    } else if (currentMonth < 6) { // Q2 -> Q1
        prevSeason = 1;
    } else if (currentMonth < 9) { // Q3 -> Q2
        prevSeason = 2;
    } else { // Q4 -> Q3
        prevSeason = 3;
    }

    const shortYear = prevYear.toString().slice(-2);
    return { year: prevYear, season: prevSeason, name: `${shortYear}-${prevSeason}시즌` };
};

export const getStartOfDayKST = (timestamp: number = Date.now()): number => {
    const kstDate = getKSTDate(timestamp);
    kstDate.setUTCHours(0, 0, 0, 0);
    // Convert back to UTC timestamp
    return kstDate.getTime() - KST_OFFSET;
};

export const formatDateTimeKST = (timestamp: number): string => {
    const kstDate = getKSTDate(timestamp);
    return kstDate.toLocaleString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
    });
};

export const formatLastLogin = (timestamp: number | undefined): string => {
    if (!timestamp) return '방문 기록 없음';
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    if (days < 365) return `${Math.floor(days / 30)}개월 전`;
    return `${Math.floor(days / 365)}년 전`;
};

export const getTimeUntilNextMondayKST = (): number => {
    const now = Date.now();
    const kstNow = getKSTDate(now);
    const dayOfWeek = kstNow.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    const nextMonday = new Date(kstNow);
    nextMonday.setUTCDate(kstNow.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday.getTime() - KST_OFFSET - now;
};