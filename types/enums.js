// --- Base Enums ---
export var Player;
(function (Player) {
    Player[Player["None"] = 0] = "None";
    Player[Player["Black"] = 1] = "Black";
    Player[Player["White"] = 2] = "White";
})(Player || (Player = {}));
export var GameMode;
(function (GameMode) {
    GameMode["Standard"] = "\uD074\uB798\uC2DD \uBC14\uB451";
    GameMode["Capture"] = "\uB530\uB0B4\uAE30 \uBC14\uB451";
    GameMode["Speed"] = "\uC2A4\uD53C\uB4DC \uBC14\uB451";
    GameMode["Base"] = "\uBCA0\uC774\uC2A4 \uBC14\uB451";
    GameMode["Hidden"] = "\uD788\uB4E0 \uBC14\uB451";
    GameMode["Missile"] = "\uBBF8\uC0AC\uC77C \uBC14\uB451";
    GameMode["Mix"] = "\uBBF9\uC2A4\uB8F0 \uBC14\uB451";
    GameMode["Dice"] = "\uC8FC\uC0AC\uC704 \uBC14\uB451";
    GameMode["Omok"] = "\uC624\uBAA9";
    GameMode["Ttamok"] = "\uB530\uBAA9";
    GameMode["Thief"] = "\uB3C4\uB451\uACFC \uACBD\uCC30";
    GameMode["Alkkagi"] = "\uC54C\uAE4C\uAE30";
    GameMode["Curling"] = "\uBC14\uB451 \uCEEC\uB9C1";
})(GameMode || (GameMode = {}));
export var LeagueTier;
(function (LeagueTier) {
    LeagueTier["Sprout"] = "\uC0C8\uC2F9";
    LeagueTier["Rookie"] = "\uB8E8\uD0A4";
    LeagueTier["Rising"] = "\uB77C\uC774\uC9D5";
    LeagueTier["Ace"] = "\uC5D0\uC774\uC2A4";
    LeagueTier["Diamond"] = "\uB2E4\uC774\uC544";
    LeagueTier["Master"] = "\uB9C8\uC2A4\uD130";
    LeagueTier["Grandmaster"] = "\uADF8\uB79C\uB4DC\uB9C8\uC2A4\uD130";
    LeagueTier["Challenger"] = "\uCC4C\uB9B0\uC800";
})(LeagueTier || (LeagueTier = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["Online"] = "online";
    UserStatus["Waiting"] = "waiting";
    UserStatus["Resting"] = "resting";
    UserStatus["Negotiating"] = "negotiating";
    UserStatus["InGame"] = "in-game";
    UserStatus["Spectating"] = "spectating";
})(UserStatus || (UserStatus = {}));
export var DiceGoVariant;
(function (DiceGoVariant) {
    DiceGoVariant["Basic"] = "basic";
})(DiceGoVariant || (DiceGoVariant = {}));
export var AlkkagiPlacementType;
(function (AlkkagiPlacementType) {
    AlkkagiPlacementType["TurnByTurn"] = "\uAD50\uB300 \uBC30\uCE58";
    AlkkagiPlacementType["Simultaneous"] = "\uC77C\uAD04 \uBC30\uCE58";
})(AlkkagiPlacementType || (AlkkagiPlacementType = {}));
export var AlkkagiLayoutType;
(function (AlkkagiLayoutType) {
    AlkkagiLayoutType["Normal"] = "\uC77C\uBC18\uBC30\uCE58";
    AlkkagiLayoutType["Battle"] = "\uC804\uD22C\uBC30\uCE58";
})(AlkkagiLayoutType || (AlkkagiLayoutType = {}));
export var CoreStat;
(function (CoreStat) {
    CoreStat["Concentration"] = "\uC9D1\uC911\uB825";
    CoreStat["ThinkingSpeed"] = "\uC0AC\uACE0\uC18D\uB3C4";
    CoreStat["Judgment"] = "\uD310\uB2E8\uB825";
    CoreStat["Calculation"] = "\uACC4\uC0B0\uB825";
    CoreStat["CombatPower"] = "\uC804\uD22C\uB825";
    CoreStat["Stability"] = "\uC548\uC815\uAC10";
})(CoreStat || (CoreStat = {}));
export var SpecialStat;
(function (SpecialStat) {
    SpecialStat["ActionPointMax"] = "\uD589\uB3D9\uB825 \uCD5C\uB300\uCE58";
    SpecialStat["ActionPointRegen"] = "\uD589\uB3D9\uB825 \uD68C\uBCF5\uC18D\uB3C4";
    SpecialStat["StrategyXpBonus"] = "\uC804\uB7B5 \uACBD\uD5D8\uCE58 \uCD94\uAC00\uD68D\uB4DD";
    SpecialStat["PlayfulXpBonus"] = "\uB180\uC774 \uACBD\uD5D8\uCE58 \uCD94\uAC00\uD68D\uB4DD";
    SpecialStat["GoldBonus"] = "\uACBD\uAE30 \uC2B9\uB9AC\uC2DC \uACE8\uB4DC\uBCF4\uC0C1 \uCD94\uAC00";
    SpecialStat["ItemDropRate"] = "\uC7A5\uBE44\uC0C1\uC790 \uD68D\uB4DD\uD655\uB960 \uC99D\uAC00";
    SpecialStat["MaterialDropRate"] = "\uC7AC\uB8CC\uC0C1\uC790 \uD68D\uB4DD\uD655\uB960 \uC99D\uAC00";
})(SpecialStat || (SpecialStat = {}));
export var MythicStat;
(function (MythicStat) {
    MythicStat["MannerActionCooldown"] = "\uB9E4\uB108 \uC561\uC158 \uBC84\uD2BC \uC0DD\uC131\uC2DC\uAC04 \uAC10\uC18C";
    MythicStat["StrategicGoldBonus"] = "\uC804\uB7B5 \uBC14\uB451 \uACBD\uAE30\uC911 \uCC29\uC218\uC2DC 20%\uD655\uB960\uB85C \uACE8\uB4DC\uD68D\uB4DD(10~50\uACE8\uB4DC) \uCD5C\uB3005\uD68C";
    MythicStat["PlayfulGoldBonus"] = "\uB180\uC774 \uBC14\uB451 \uACBD\uAE30\uC911 60\uCD08\uB9C8\uB2E4 20%\uD655\uB960\uB85C \uACE8\uB4DC\uD68D\uB4DD(10~50\uACE8\uB4DC) \uCD5C\uB3005\uD68C";
    MythicStat["DiceGoOddBonus"] = "\uC8FC\uC0AC\uC704 \uD640/\uC9DD \uBCF4\uB108\uC2A4";
    MythicStat["AlkkagiSlowBonus"] = "\uC54C\uAE4C\uAE30 \uBC0F \uBC14\uB451\uCEEC\uB9C1\uC5D0\uC11C \uC2AC\uB85C\uC6B0 \uC544\uC774\uD15C 1\uAC1C\uCD94\uAC00";
    MythicStat["AlkkagiAimingBonus"] = "\uC54C\uAE4C\uAE30 \uBC0F \uBC14\uB451\uCEEC\uB9C1\uC5D0\uC11C \uC870\uC900\uC120 \uC544\uC774\uD15C 1\uAC1C\uCD94\uAC00";
})(MythicStat || (MythicStat = {}));
export var SinglePlayerLevel;
(function (SinglePlayerLevel) {
    SinglePlayerLevel["\uC785\uBB38"] = "\uC785\uBB38";
    SinglePlayerLevel["\uCD08\uAE09"] = "\uCD08\uAE09";
    SinglePlayerLevel["\uC911\uAE09"] = "\uC911\uAE09";
    SinglePlayerLevel["\uACE0\uAE09"] = "\uACE0\uAE09";
    SinglePlayerLevel["\uC720\uB2E8\uC790"] = "\uC720\uB2E8\uC790";
})(SinglePlayerLevel || (SinglePlayerLevel = {}));
