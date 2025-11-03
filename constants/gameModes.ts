import { GameMode } from '../types.ts';

export const SPECIAL_GAME_MODES = [
  { mode: GameMode.Standard, name: "정통 바둑", description: "일반적인 정통 바둑입니다.", available: true, image: "/images/simbols/simbol1.png" },
  { mode: GameMode.Capture, name: "따내기 바둑", description: "정해진 개수의 돌을 먼저 따내는 사람이 승리하는 바둑입니다.", available: true, image: "/images/simbols/simbol2.png" },
  { mode: GameMode.Speed, name: "스피드 바둑", description: "한 수를 둘 때마다 시간이 추가되는 피셔 방식입니다. 계가 시 남은 시간으로 보너스 집을 얻습니다.", available: true, image: "/images/simbols/simbol3.png" },
  { mode: GameMode.Base, name: "베이스 바둑", description: "각자 비밀리에 '베이스돌'을 놓아 독특한 시작 판을 만듭니다. 돌이 공개된 후, 초기 형세를 판단하여 흑/백과 덤을 결정하는 입찰을 진행합니다. 상대의 베이스돌을 따내면 보너스 점수를 얻는 전략적인 바둑입니다.", available: true, image: "/images/simbols/simbol4.png" },
  { mode: GameMode.Hidden, name: "히든 바둑", description: "상대에게 보이지 않는 '히든돌'을 놓아 허를 찌르고, 한정된 '스캔' 아이템으로 상대의 비밀 착수를 간파하는 심리전 바둑입니다. 히든돌을 찾아내 따내면 큰 점수를 얻을 수 있어, 대국 내내 긴장감을 늦출 수 없습니다.", available: true, image: "/images/simbols/simbol5.png" },
  { mode: GameMode.Missile, name: "미사일 바둑", description: "미사일 아이템으로 내 돌을 움직여 전략적인 행마를 구사하는 바둑입니다.", available: true, image: "/images/simbols/simbol6.png" },
  { mode: GameMode.Mix, name: "믹스 바둑", description: "따내기, 스피드, 베이스, 히든, 미사일 바둑의 규칙을 2개 이상 섞어서 대결하는 모드입니다.", available: true, image: "/images/simbols/simbol7.png" }
];

export const PLAYFUL_GAME_MODES = [
  { mode: GameMode.Dice, name: "주사위 바둑", description: "총 3라운드에 걸쳐, 주사위를 굴려 나온 수만큼 흑돌을 놓아 백돌을 모두 따내는 게임입니다. 두 플레이어 모두 흑돌로 플레이합니다.", available: true, image: "/images/simbols/simbolp1.png" },
  { mode: GameMode.Omok, name: "오목", description: "다섯 개의 돌을 먼저 나란히 놓으면 승리하는 클래식 게임입니다.", available: true, image: "/images/simbols/simbolp2.png" },
  { mode: GameMode.Ttamok, name: "따목", description: "오목을 만들거나 정해진 상대 돌을 먼저 따내면 승리합니다.", available: true, image: "/images/simbols/simbolp3.png" },
  { mode: GameMode.Thief, name: "도둑잡기", description: "도둑(흑)과 경찰(백) 역할을 번갈아 맡아 5턴씩 진행하며, 총점으로 승패를 가리는 전략 주사위 게임입니다.", available: true, image: "/images/simbols/simbolp4.png" },
  { mode: GameMode.Alkkagi, name: "알까기", description: "손가락으로 바둑돌을 쳐서 상대방의 돌을 판 밖으로 밀어내는 게임입니다.", available: true, image: "/images/simbols/simbolp5.png" },
  { mode: GameMode.Curling, name: "컬링", description: "바둑판 위에서 돌을 미끄러뜨려 목표(하우스)에 가장 가깝게 보내 점수를 얻는 게임입니다.", available: true, image: "/images/simbols/simbolp6.png" }
];
