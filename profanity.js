// profanity.ts
// A list of Korean profanities. This list can be expanded.
export const profanityList = [
    '개새끼', '개새', '개년', '개자식',
    '씨발', '시발', 'ㅅㅂ', 'ㅆㅂ',
    '존나', '존나게', 'ㅈㄴ',
    '병신', '븅신', 'ㅄ',
    '미친놈', '미친년', '미친',
    '지랄', 'ㅈㄹ',
    '좆', '좇',
    '씹', '썅',
    '새끼',
    '애미', '애비',
    '느금마', '니애미', '니애비',
    '섹스', 'ㅅㅅ',
    '엠창', '앰창',
    '뻐큐', '뻑큐',
    '바보', '멍청이', '똥개',
];
/**
 * Checks if a given text contains any profanity from the list.
 * @param text The string to check.
 * @returns True if profanity is found, false otherwise.
 */
export const containsProfanity = (text) => {
    if (!text)
        return false;
    const lowercasedText = text.toLowerCase().replace(/\s/g, ''); // also remove spaces to catch "ㅅ ㅂ"
    return profanityList.some(word => lowercasedText.includes(word));
};
