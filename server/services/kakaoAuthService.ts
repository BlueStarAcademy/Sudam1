/**
 * 카카오 로그인 인증 서비스
 */

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'http://localhost:5173/auth/kakao/callback';

/**
 * 카카오 로그인 URL을 생성합니다.
 */
export const getKakaoAuthUrl = (): string => {
    if (!KAKAO_CLIENT_ID) {
        throw new Error('KAKAO_CLIENT_ID is not configured');
    }

    const params = new URLSearchParams({
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: KAKAO_REDIRECT_URI,
        response_type: 'code',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
};

/**
 * 카카오 인증 코드로 액세스 토큰을 받아옵니다.
 */
export const getKakaoAccessToken = async (code: string): Promise<string> => {
    if (!KAKAO_CLIENT_ID || !KAKAO_CLIENT_SECRET) {
        throw new Error('Kakao credentials are not configured');
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: KAKAO_CLIENT_ID,
            client_secret: KAKAO_CLIENT_SECRET,
            redirect_uri: KAKAO_REDIRECT_URI,
            code,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get Kakao access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
};

/**
 * 카카오 액세스 토큰으로 사용자 정보를 받아옵니다.
 */
export const getKakaoUserInfo = async (accessToken: string): Promise<{
    id: string;
    email?: string;
    nickname?: string;
    profileImage?: string;
}> => {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get Kakao user info: ${error}`);
    }

    const data = await response.json();
    return {
        id: String(data.id),
        email: data.kakao_account?.email,
        nickname: data.kakao_account?.profile?.nickname,
        profileImage: data.kakao_account?.profile?.profile_image_url,
    };
};

