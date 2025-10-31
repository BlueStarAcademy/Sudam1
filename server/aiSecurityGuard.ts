import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

// Simple in-memory cache to avoid re-analyzing the same message repeatedly
const messageCache = new Map<string, ModerationResult>();

// Define this here as it's a new type for this service
export interface ModerationResult {
    is_inappropriate: boolean;
    severity: "none" | "low" | "medium" | "high" | "critical";
    reason: string;
    penalty_points: number;
    ban_duration_minutes: number;
    bot_message: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const model = 'gemini-2.5-flash';
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        is_inappropriate: { type: Type.BOOLEAN, description: "메시지가 부적절한가?" },
        severity: { type: Type.STRING, enum: ["none", "low", "medium", "high", "critical"], description: "부적절함의 심각도." },
        reason: { type: Type.STRING, description: "제재 이유 (예: 욕설 사용)." },
        penalty_points: { type: Type.INTEGER, description: "차감할 매너 점수 (음수 값)." },
        ban_duration_minutes: { type: Type.INTEGER, description: "채팅 금지 시간(분 단위)." },
        bot_message: { type: Type.STRING, description: "채팅창에 표시할 봇 메시지." },
    },
    required: ["is_inappropriate", "severity", "reason", "penalty_points", "ban_duration_minutes", "bot_message"]
};
const systemInstruction = `당신은 온라인 바둑 게임 커뮤니티의 AI 보안관봇입니다. 당신의 임무는 부적절한 채팅 메시지를 감지하고 제재하는 것입니다. 사용자의 메시지에 욕설, 인신공격, 혐오 발언, 정치적 내용, 지역감정 유발 내용이 있는지 분석하세요. 심각도에 따라 제재를 결정해야 합니다. 당신의 응답은 반드시 다음 구조의 JSON 객체여야 합니다:

- is_inappropriate: 메시지가 규칙을 위반하면 true, 아니면 false.
- severity: 심각도. "none", "low", "medium", "high", "critical" 중 하나.
  - "none": 위반 없음. penalty_points와 ban_duration_minutes는 반드시 0이어야 합니다.
  - "low": 가벼운 위반 (예: 가벼운 불만 표현). penalty_points: -1 ~ -3. ban_duration_minutes: 0 (경고만).
  - "medium": 명백한 욕설 또는 모욕. penalty_points: -4 ~ -8. ban_duration_minutes: 5.
  - "high": 반복적인 위반, 특정인 대상 괴롭힘, 혐오 발언. penalty_points: -9 ~ -15. ban_duration_minutes: 10 또는 30.
  - "critical": 심각한 위협, 스팸, 극심한 위반. penalty_points: -16 ~ -20. ban_duration_minutes: 60.
- reason: 제재에 대한 간결하고 중립적인 설명 (예: "욕설 사용", "비방 및 인신공격").
- penalty_points: 차감할 매너 점수 (반드시 0 또는 음수). is_inappropriate가 false이면 0이어야 합니다.
- ban_duration_minutes: 채팅 금지 시간(분 단위) (0, 5, 10, 30, 60). is_inappropriate가 false이면 0이어야 합니다.
- bot_message: 봇이 채팅에 게시할 메시지. 제재가 없을 경우 빈 문자열("")이어야 합니다. 제재 시 예시: '[AI 보안관봇] OOO님의 메시지에서 욕설이 감지되어 매너 점수 -5점 및 채팅 5분 정지 조치되었습니다.'`;

export async function moderateMessage(message: string, username: string): Promise<ModerationResult | null> {
    if (messageCache.has(message)) {
        return messageCache.get(message)!;
    }
    
    try {
        const fullPrompt = `사용자 "${username}"의 메시지: "${message}"`;
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.2, // Be consistent
            },
        });

        const jsonStr = response.text;
        if (!jsonStr) {
            console.error("Gemini API returned an empty text response for moderation.");
            return null;
        }
        const result: ModerationResult = JSON.parse(jsonStr.trim());

        // Cache the result for a short time to prevent spamming the API with the same message
        if (messageCache.size > 100) {
            const firstKey = messageCache.keys().next().value;
            messageCache.delete(firstKey);
        }
        messageCache.set(message, result);

        return result;
    } catch (error) {
        console.error("Error calling Gemini API for moderation:", error);
        return null;
    }
}