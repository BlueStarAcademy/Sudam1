import React from 'react';

interface AvatarProps {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  borderUrl?: string | null;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ userId, userName, avatarUrl, borderUrl, size = 40, className = '' }) => {
  const remSize = size / 16;
  const isColorBorder = borderUrl && (borderUrl.startsWith('#') || borderUrl.startsWith('conic-gradient'));
  const isImageBorder = borderUrl && !isColorBorder;
  const finalAvatarUrl = avatarUrl || '/images/profiles/profile1.png';

  // Case 1: Image Border
  if (isImageBorder) {
    let borderRemSize = remSize * 1.4; // Default for 'Round' borders
    if (borderUrl.includes('Ring')) { // 'Ring' borders are more ornate and larger
        borderRemSize = remSize * 1.5;
    }

    // Custom positioning for specific borders
    const avatarContainerStyle: React.CSSProperties = {
        width: `${remSize}rem`,
        height: `${remSize}rem`,
    };

    if (borderUrl.includes('Ring5.png')) {
        // 프리미엄1 border needs avatar shifted to the left to align with the circle in the border image.
        avatarContainerStyle.transform = `translateX(-${remSize * 0.20}rem)`;
    }

    return (
      <div
        className={`relative flex-shrink-0 flex items-center justify-center ${className}`}
        style={{ width: `${borderRemSize}rem`, height: `${borderRemSize}rem` }}
      >
        {/* Avatar on bottom, centered, with original size */}
        <div
          className="rounded-full overflow-hidden bg-gray-700"
          style={avatarContainerStyle}
        >
          <img src={finalAvatarUrl} alt={userName} className="w-full h-full object-cover" />
        </div>
        {/* Border image on top (overlay) */}
        <img
          src={borderUrl}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none object-contain"
          aria-hidden="true"
        />
      </div>
    );
  }
  
  // Case 2: Color Border
  if (isColorBorder) {
    const innerRemSize = remSize * 0.85;
    const isGradient = borderUrl.startsWith('conic-gradient');
    return (
      <div
        className={`relative flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
        style={{ 
            width: `${remSize}rem`, 
            height: `${remSize}rem`, 
            ...(isGradient ? { background: borderUrl } : { backgroundColor: borderUrl }) 
        }}
      >
        <div
          className="flex items-center justify-center rounded-full overflow-hidden bg-gray-700"
          style={{ width: `${innerRemSize}rem`, height: `${innerRemSize}rem` }}
        >
          <img src={finalAvatarUrl} alt={userName} className="w-full h-full object-cover" />
        </div>
      </div>
    );
  }

  // Case 3: No Border (default)
  return (
    <div
      className={`rounded-full overflow-hidden bg-gray-700 flex-shrink-0 ${className}`}
      style={{ width: `${remSize}rem`, height: `${remSize}rem` }}
    >
      <img src={finalAvatarUrl} alt={userName} className="w-full h-full object-cover" />
    </div>
  );
};

export default React.memo(Avatar);