import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  get,
  set,
  update,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  functions,
  httpsCallable
} from './firebase.js';
import { onValue } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js';
import { enqueueMail } from './mail-service.js';
import { sendSystemMessage } from './chat.js';
import {
  TIERS,
  TIER_INDEX,
  TIER_RANK,
  MAX_LEVEL,
  DEFAULT_DROP_RATES,
  DEFAULT_GOLD_SCALING,
  DEFAULT_POTION_SETTINGS,
  DEFAULT_HYPER_POTION_SETTINGS,
  RARE_ANIMATION_DURATION_MS,
  RARE_ANIMATION_FADE_MS,
  DEFAULT_SHOP_PRICES,
  DIAMOND_SHOP_PACKS,
  DIAMOND_PACK_LOOKUP,
  ENHANCE_TICKET_COST,
  ENHANCE_PROTECT_COST,
  ENHANCE_EXPECTED_GOLD,
  DEFAULT_FLAGS,
  DEFAULT_RARE_ANIMATIONS,
  DEFAULT_MONSTER_SCALING,
  DEFAULT_DIFFICULTY_ADJUSTMENTS,
  CHARACTER_IMAGE_PLACEHOLDER,
  GLOBAL_CONFIG_PATH,
  PART_DEFS,
  PART_KEYS,
  PART_ICONS,
  ALL_USERS_OPTION,
  defaultWeights,
  cfgVersion,
  CLASS_LABELS,
  GEAR_SSPLUS_GIF,
  GEAR_SSSPLUS_GIF,
  LEGACY_GEAR_RARE_GIF,
  CHARACTER_SSPLUS_GIF,
  CHARACTER_SSSPLUS_GIF,
  LEGACY_CHARACTER_RARE_GIF,
  COUPON_TYPES,
  GEAR_COUPON_DEFS,
  CHARACTER_COUPON_DEFS,
  PET_COUPON_DEFS
} from './constants.js';
import {
  chooseTier,
  rescaledPick,
  rollStatFor,
  choosePart,
  expectedCounts,
  chiSquarePValue,
  winProbability,
  levelReward,
  shuffle,
  isAtLeast,
  isLegendaryGearTier,
  isLegendaryCharacterTier,
  CD_MANUAL_MS,
  CD_AUTO_MS
} from './gacha-system.js';
import {
  clampNumber,
  formatPct,
  formatNum,
  formatMultiplier,
  formatDateTime
} from './ui-utils.js';

try {
  console.log('[refactor] Constants check:', typeof TIERS, typeof DEFAULT_DROP_RATES);
  console.log('[refactor] Gacha check:', typeof chooseTier, typeof rollStatFor);
} catch (error) {
  console.error('[refactor] Missing imports detected:', error?.message || error);
}
import {
  sanitizePetState,
  createDefaultPetState,
  PET_IDS,
  PET_DEFS,
  sanitizePetWeights,
  describePetAbilities,
  computePlayerStats as deriveCombatStats,
  CHARACTER_IDS,
  CHARACTER_IDS_BY_TIER,
  createDefaultCharacterState,
  sanitizeCharacterState,
  getCharacterDefinition,
  getCharacterImageVariants,
  effectiveStat,
  ENHANCEMENT_RULES,
  getEnhancementRequirement,
  getEnhancementRule,
  getEnhancementMultiplier,
  MAX_ENHANCEMENT_LEVEL,
  clampEnhancementLevel,
  clampEnhancementProgress,
  sanitizeUserSettings,
  sanitizeCharacterBalance,
  sanitizeDifficultyAdjustments,
  DEFAULT_CHARACTER_BALANCE,
  CHARACTER_CLASS_IDS
} from './combat-core.js';
import {
  QUEST_DEFINITIONS,
  QUEST_LOOKUP,
  createDefaultQuestState,
  sanitizeQuestState,
  questRewardSummary
} from './quest-core.js';

import {
  state,
  els,
  initializeState,
  initializeElements,
  addListener,
  setInputValue,
  setCheckboxState,
  setTextContent,
  PROFILE_SAVE_DELAY,
  PROFILE_SAVE_RETRY_DELAYS,
  USERNAME_NAMESPACE
} from './app-context.js';
import {
  getCurrentUser,
  setCurrentUser,
  getUserProfile,
  setUserProfileState,
  getProfileSaveTimer,
  setProfileSaveTimerState,
  getForgeEffectTimer,
  setForgeEffectTimerState
} from './state/index.js';
import { initializeLegacyBridge } from './state/bridge.js';
import { attachAuthObserver } from './state/auth.js';

      // Slot Machine State
      let slotMachineState = {
        overlay: null,
        isRunning: false,
        currentMode: null, // 'single' or 'multi'
        results: [],
        skipRequested: false,
        collectedData: null,
        drawCount: 0
      };

      // Slot Machine Event Handlers (선언을 앞으로 이동)
      let slotSkipHandler = null;
      let escKeyHandler = null;

      const $ = (q)=>document.querySelector(q);
      const $$ = (q)=>Array.from(document.querySelectorAll(q));

      initializeElements({
        appWrap: $('#appWrap'), logoutBtn: $('#logoutBtn'), whoami: $('#whoami'), toAdmin: $('#toAdmin'), toUser: $('#toUser'), toBattle: $('#toBattle'), goBattle: $('#goBattle'), toPvp: $('#toPvp'),
        questBtn: $('#questBtn'), questBadge: $('#questBadge'), questOverlay: $('#questOverlay'), questPanel: $('#questPanel'), questClose: $('#questClose'), questList: $('#questList'), questEmpty: $('#questEmpty'), questToast: $('#questToast'),
        adminPanel: $('#adminPanel'), adminOldPass: $('#adminOldPass'), adminNewPass: $('#adminNewPass'), adminChangePw: $('#adminChangePw'), adminMsg: $('#adminMsg'),
        dropPotionBase: $('#dropPotionBase'), dropPotionPer: $('#dropPotionPer'), dropPotionMax: $('#dropPotionMax'),
        dropHyperBase: $('#dropHyperBase'), dropHyperPer: $('#dropHyperPer'), dropHyperMax: $('#dropHyperMax'),
        dropProtectBase: $('#dropProtectBase'), dropProtectPer: $('#dropProtectPer'), dropProtectMax: $('#dropProtectMax'),
        dropEnhanceBase: $('#dropEnhanceBase'), dropEnhancePer: $('#dropEnhancePer'), dropEnhanceMax: $('#dropEnhanceMax'),
        dropBattleResBase: $('#dropBattleResBase'), dropBattleResPer: $('#dropBattleResPer'), dropBattleResMax: $('#dropBattleResMax'),
        goldMinLow: $('#goldMinLow'), goldMaxLow: $('#goldMaxLow'), goldMinHigh: $('#goldMinHigh'), goldMaxHigh: $('#goldMaxHigh'),
        priceInputPotion: $('#priceInputPotion'), priceInputHyper: $('#priceInputHyper'), priceInputProtect: $('#priceInputProtect'), priceInputEnhance: $('#priceInputEnhance'), priceInputBattleRes: $('#priceInputBattleRes'), priceInputStarter: $('#priceInputStarter'),
        potionDuration: $('#potionDuration'), potionManualCd: $('#potionManualCd'), potionAutoCd: $('#potionAutoCd'), potionSpeedMult: $('#potionSpeedMult'),
        hyperDuration: $('#hyperDuration'), hyperManualCd: $('#hyperManualCd'), hyperAutoCd: $('#hyperAutoCd'), hyperSpeedMult: $('#hyperSpeedMult'),
        monsterBasePower: $('#monsterBasePower'), monsterMaxPower: $('#monsterMaxPower'), monsterCurve: $('#monsterCurve'), monsterDifficultyInput: $('#monsterDifficulty'), monsterDifficultyMinus: $('#monsterDifficultyMinus'), monsterDifficultyPlus: $('#monsterDifficultyPlus'), monsterDifficultyApply: $('#monsterDifficultyApply'), monsterDifficultyStatus: $('#monsterDifficultyStatus'),
        difficultyEasyInput: $('#difficultyEasyPercent'), difficultyHardInput: $('#difficultyHardPercent'),
        difficultyNormalPreview: $('#difficultyNormalPreview'), difficultyEasyPreview: $('#difficultyEasyPreview'), difficultyHardPreview: $('#difficultyHardPreview'),
        monsterPreviewTableBody: $('#monsterPreviewTable tbody'),
        gachaPresetGearBody: $('#gearPresetTableBody'), gachaPresetCharacterBody: $('#characterPresetTableBody'),
        gearPresetReset: $('#gearPresetReset'), characterPresetReset: $('#characterPresetReset'),
        saveDrops: $('#saveDrops'),
        mode: $('#mode'), seed: $('#seed'), lock: $('#lock'), petTickets: $('#petTicketCount'),
        adminMode: $('#adminMode'), adminSeed: $('#adminSeed'), adminLock: $('#adminLock'),
        weightsTable: $('#weightsTable tbody'),
        characterWeightsTable: $('#characterWeightsTable'),
        characterWeightsBody: $('#characterWeightsBody'),
        gearConfigWrap: $('#gearConfigWrap'),
        petConfigWrap: $('#petConfigWrap'),
        characterConfigWrap: $('#characterConfigWrap'),
        petWeightTableBody: $('#petWeightTableBody'),
        gachaModeGearConfig: $('#gachaModeGearConfig'),
        gachaModePetConfig: $('#gachaModePetConfig'),
        gachaModeCharacterConfig: $('#gachaModeCharacterConfig'),
        // Admin page weight controls
        adminGachaModeGearConfig: $('#adminGachaModeGearConfig'),
        adminGachaModePetConfig: $('#adminGachaModePetConfig'),
        adminGachaModeCharacterConfig: $('#adminGachaModeCharacterConfig'),
        adminWeightsTable: $('#adminWeightsTable tbody'),
        adminCharacterWeightsTable: $('#adminCharacterWeightsTable'),
        adminCharacterWeightsBody: $('#adminCharacterWeightsBody'),
        adminGearConfigWrap: $('#adminGearConfigWrap'),
        adminPetConfigWrap: $('#adminPetConfigWrap'),
        adminCharacterConfigWrap: $('#adminCharacterConfigWrap'),
        adminPetWeightTableBody: $('#adminPetWeightTableBody'),
        // 확률 표시 관련 요소들
        probDisplayModeGear: $('#probDisplayModeGear'),
        probDisplayModeCharacter: $('#probDisplayModeCharacter'),
        gearProbabilityWrap: $('#gearProbabilityWrap'),
        characterProbabilityWrap: $('#characterProbabilityWrap'),
        gearProbabilityBody: $('#gearProbabilityBody'),
        characterProbabilityBody: $('#characterProbabilityBody'),
        probabilityUpdateStatus: $('#probabilityUpdateStatus'),
        adminProbDisplayModeGear: $('#adminProbDisplayModeGear'),
        adminProbDisplayModeCharacter: $('#adminProbDisplayModeCharacter'),
        adminGearProbabilityWrap: $('#adminGearProbabilityWrap'),
        adminCharacterProbabilityWrap: $('#adminCharacterProbabilityWrap'),
        adminGearProbabilityBody: $('#adminGearProbabilityBody'),
        adminCharacterProbabilityBody: $('#adminCharacterProbabilityBody'),
        pityEnabled: $('#pityEnabled'), pityFloor: $('#pityFloor'), pitySpan: $('#pitySpan'),
        g10Enabled: $('#g10Enabled'), g10Tier: $('#g10Tier'),
        adminPityEnabled: $('#adminPityEnabled'), adminPityFloor: $('#adminPityFloor'), adminPitySpan: $('#adminPitySpan'),
        adminG10Enabled: $('#adminG10Enabled'), adminG10Tier: $('#adminG10Tier'),
        drawBasic1: $('#drawBasic1'), drawBoost1: $('#drawBoost1'), drawPremium1: $('#drawPremium1'),
        drawBasic10: $('#drawBasic10'), drawBoost10: $('#drawBoost10'), drawPremium10: $('#drawPremium10'),
        drawCharBasic1: $('#drawCharBasic1'), drawCharBoost1: $('#drawCharBoost1'), drawCharPremium1: $('#drawCharPremium1'),
        drawCharBasic10: $('#drawCharBasic10'), drawCharBoost10: $('#drawCharBoost10'), drawCharPremium10: $('#drawCharPremium10'),
        drawPet1: $('#drawPet1'), drawPet10: $('#drawPet10'),
        cancel: $('#cancel'), speed: $('#speed'), bar: $('#bar'),
        drawMsg: $('#drawMsg'),
        gearDrawControls: $('#gearDrawControls'), petDrawControls: $('#petDrawControls'), characterDrawControls: $('#characterDrawControls'),
        gachaModeGearDraw: $('#gachaModeGearDraw'), gachaModePetDraw: $('#gachaModePetDraw'), gachaModeCharacterDraw: $('#gachaModeCharacterDraw'),
        scope: $('#scope'), statsMode: $('#statsMode'), nDraws: $('#nDraws'), pval: $('#pval'), statsTable: $('#statsTable tbody'), petStatsTable: $('#petStatsTable tbody'), characterStatsTable: $('#characterStatsTable tbody'), resetSession: $('#resetSession'), resetGlobal: $('#resetGlobal'),
        gearStatsWrap: $('#gearStatsWrap'), petStatsWrap: $('#petStatsWrap'), characterStatsWrap: $('#characterStatsWrap'),
        chart: $('#chart'), log: $('#log'),
        atkTotal: $('#atkTotal'), defTotal: $('#defTotal'), nextMonster: $('#nextMonster'), monLevel: $('#monLevel'), monLevelVal: $('#monLevelVal'), winProb: $('#winProb'), fightBtn: $('#fightBtn'), fightResult: $('#fightResult'), autoHuntBtn: $('#autoHuntBtn'), manualCd: $('#manualCd'), autoCd: $('#autoCd'), lvlDec: $('#lvlDec'), lvlInc: $('#lvlInc'), potionCount: $('#potionCount'), usePotion: $('#usePotion'), hyperPotionCount: $('#hyperPotionCount'), useHyperPotion: $('#useHyperPotion'), buffInfo: $('#buffInfo'), claimRevive: $('#claimRevive'), battleResUse: $('#battleResUse'), battleResRemain: $('#battleResRemain'), battleWinProb: $('#battleWinProb'), playerHealthBar: $('#playerHealthBar'), enemyHealthBar: $('#enemyHealthBar'), playerAtkStat: $('#playerAtkStat'), playerDefStat: $('#playerDefStat'), battleEnemyLevel: $('#battleEnemyLevel'), battleEnemyReward: $('#battleEnemyReward'),
        invCount: $('#invCount'), equipGrid: $('#equipGrid'), spareList: $('#spareList'),
        forgeTarget: $('#forgeTarget'), forgeLv: $('#forgeLv'), forgeMul: $('#forgeMul'), forgeStageMul: $('#forgeStageMul'), forgePreview: $('#forgePreview'), forgeOnce: $('#forgeOnce'), forgeAuto: $('#forgeAuto'), forgeTableBody: $('#forgeTableBody'), forgeReset: $('#forgeReset'), forgeMsg: $('#forgeMsg'), forgeEffect: $('#forgeEffect'), forgeProtectUse: $('#forgeProtectUse'), protectCount: $('#protectCount'), enhanceCount: $('#enhanceCount'), reviveCount: $('#reviveCount'), gearShardSummary: $('#gearShardSummary'), forgeShardProgress: $('#forgeShardProgress'), forgeShardAvail: $('#forgeShardAvail'), forgeTicketRate: $('#forgeTicketRate'), forgeTicketCost: $('#forgeTicketCost'), forgeTicketHave: $('#forgeTicketHave'), forgeProtectHave: $('#forgeProtectHave'), forgeGoldHave: $('#forgeGoldHave'), forgeTicket: $('#forgeTicket'), forgeTicketProtect: $('#forgeTicketProtect'), forgeTicketAuto: $('#forgeTicketAuto'),
        pricePotion: $('#pricePotion'), priceHyper: $('#priceHyper'), priceProtect: $('#priceProtect'), priceEnhance: $('#priceEnhance'), priceBattleRes: $('#priceBattleRes'), priceStarter: $('#priceStarter'),
        invPotion: $('#invPotion'), invHyper: $('#invHyper'), invProtect: $('#invProtect'), invEnhance: $('#invEnhance'), invBattleRes: $('#invBattleRes'), invHolyWater: $('#invHolyWater'), shopPanel: $('#shop'), diamondShop: $('#diamondShop'), diamondShopGrid: $('#diamondShopGrid'),
        petList: $('#petList'),
        characterList: $('#characterList'),
        characterDetailHint: $('#characterDetailHint'),
        characterDetailModal: $('#characterDetailModal'),
        characterDetailBody: $('#characterDetailBody'),
        characterDetailClose: $('#characterDetailClose'),
        saveCfg: $('#saveCfg'), loadCfg: $('#loadCfg'), cfgFile: $('#cfgFile'), shareLink: $('#shareLink'), points: $('#points'), gold: $('#gold'), diamonds: $('#diamonds'), drawResults: $('#drawResults'), shopMsg: $('#shopMsg'),
        userOptionsBtn: $('#userOptionsBtn'), userOptionsModal: $('#userOptionsModal'), userOptionsSave: $('#userOptionsSave'), userOptionsClose: $('#userOptionsClose'), userOptionsCharacterGif: $('#userOptionsCharacterGif'), userOptionsPetGif: $('#userOptionsPetGif'),
        adminPresetSelect: $('#adminPresetSelect'), adminPresetApply: $('#adminPresetApply'), adminPresetLoad: $('#adminPresetLoad'), adminPresetDelete: $('#adminPresetDelete'), adminPresetName: $('#adminPresetName'), adminPresetSave: $('#adminPresetSave'), presetAdminMsg: $('#presetAdminMsg'),
        adminUserSelect: $('#adminUserSelect'), adminUserStats: $('#adminUserStats'), adminGrantPoints: $('#adminGrantPoints'), adminGrantGold: $('#adminGrantGold'), adminGrantDiamonds: $('#adminGrantDiamonds'), adminGrantPetTickets: $('#adminGrantPetTickets'), adminGrantSubmit: $('#adminGrantSubmit'),
        adminCouponUserSelect: $('#adminCouponUserSelect'), adminCouponUserStats: $('#adminCouponUserStats'), adminCouponType: $('#adminCouponType'), adminCouponSubmit: $('#adminCouponSubmit'), adminCouponMsg: $('#adminCouponMsg'),
        adminUserSelect2: $('#adminUserSelect2'), adminUserStats2: $('#adminUserStats2'), adminUserSelect3: $('#adminUserSelect3'), adminUserStats3: $('#adminUserStats3'),
        adminBackupRefresh: $('#adminBackupRefresh'), adminRestoreFromMirror: $('#adminRestoreFromMirror'), adminRestoreFromSnapshot: $('#adminRestoreFromSnapshot'), adminSnapshotSelect: $('#adminSnapshotSelect'), adminBackupStatus: $('#adminBackupStatus'), adminSnapshotTableBody: $('#adminSnapshotTableBody'),
        globalPresetSelect: $('#globalPresetSelect'), personalPresetSelect: $('#personalPresetSelect'), applyGlobalPreset: $('#applyGlobalPreset'), applyPersonalPreset: $('#applyPersonalPreset'), personalPresetName: $('#personalPresetName'), savePersonalPreset: $('#savePersonalPreset'), presetMsg: $('#presetMsg'), toggleUserEdit: $('#toggleUserEdit'),
        petTicketInline: $('#petTicketInline'),
        holyWaterCount: $('#holyWaterCount'),
        priceHolyWater: $('#priceHolyWater'),
        rareAnimationOverlay: $('#rareAnimationOverlay'),
        rareAnimationImage: $('#rareAnimationImage'),
        rareAnimationMessage: $('#rareAnimationMessage'),
        rareAnimationTier: $('#rareAnimationTier'),
        rareAnimationSkip: $('#rareAnimationSkip'),
        legendaryOverlay: $('#legendaryOverlay'),
        gearLegendaryModal: $('#gearLegendaryModal'),
        characterLegendaryModal: $('#characterLegendaryModal'),
        gearLegendaryTitle: $('#gearLegendaryTitle'),
        gearNewTier: $('#gearNewTier'),
        gearNewPart: $('#gearNewPart'),
        gearNewBase: $('#gearNewBase'),
        gearNewEffective: $('#gearNewEffective'),
        gearCurrentTier: $('#gearCurrentTier'),
        gearCurrentPart: $('#gearCurrentPart'),
        gearCurrentBase: $('#gearCurrentBase'),
        gearCurrentEffective: $('#gearCurrentEffective'),
        gearComparisonDelta: $('#gearComparisonDelta'),
        gearEquipBtn: $('#gearEquipBtn'),
        gearSpareBtn: $('#gearSpareBtn'),
        gearDiscardBtn: $('#gearDiscardBtn'),
        characterLegendaryTitle: $('#characterLegendaryTitle'),
        characterNewImage: $('#characterNewImage'),
        characterNewName: $('#characterNewName'),
        characterNewTier: $('#characterNewTier'),
        characterNewClass: $('#characterNewClass'),
        characterNewCount: $('#characterNewCount'),
        characterNewStats: $('#characterNewStats'),
        characterCurrentImage: $('#characterCurrentImage'),
        characterCurrentName: $('#characterCurrentName'),
        characterCurrentTier: $('#characterCurrentTier'),
        characterCurrentClass: $('#characterCurrentClass'),
        characterCurrentCount: $('#characterCurrentCount'),
        characterCurrentStats: $('#characterCurrentStats'),
        characterLegendaryClose: $('#characterLegendaryClose'),
        characterBalanceTable: $('#characterBalanceTable'),
        characterBalanceOffsetTable: $('#characterBalanceOffsetTable'),
        characterBalanceMsg: $('#characterBalanceMsg'),
        characterBalanceSnapshot: $('#characterBalanceSnapshot'),
        flagAnimations: $('#flagAnimations'),
        flagBanners: $('#flagBanners'),
        flagRewardsPreset: $('#flagRewardsPreset'),
        adminFlagMsg: $('#adminFlagMsg'),
        rareAnimKind: $('#rareAnimKind'),
        rareAnimAdd: $('#rareAnimAdd'),
        rareAnimReset: $('#rareAnimReset'),
        rareAnimSave: $('#rareAnimSave'),
        rareAnimRevert: $('#rareAnimRevert'),
        rareAnimStatus: $('#rareAnimStatus'),
        rareAnimMsg: $('#rareAnimMsg'),
        rareAnimTableBody: document.querySelector('#rareAnimTable tbody'),
        rareAnimPreview: $('#rareAnimPreview')
      });
      // Config and state
      const CHARACTER_BALANCE_FIELDS = [
        { key: 'skill', label: '스킬 배율' },
        { key: 'hp', label: 'HP' },
        { key: 'atk', label: 'ATK' },
        { key: 'def', label: 'DEF' },
        { key: 'speed', label: '속도' },
        { key: 'critRate', label: '치명타율' },
        { key: 'critDmg', label: '치명 피해' },
        { key: 'dodge', label: '회피율' }
      ];


      let userProfile = getUserProfile();
      let currentFirebaseUser = getCurrentUser();

      function setUserProfileRef(profile){
        userProfile = profile || null;
        setUserProfileState(userProfile);
      }

      function setCurrentFirebaseUserRef(user){
        currentFirebaseUser = user || null;
        setCurrentUser(currentFirebaseUser);
      }

      function getProfileSaveTimerRef(){
        return getProfileSaveTimer();
      }

      function setProfileSaveTimerRef(timer){
        setProfileSaveTimerState(timer);
      }

      function getForgeEffectTimerRef(){
        return getForgeEffectTimer();
      }

      function setForgeEffectTimerRef(timer){
        setForgeEffectTimerState(timer);
      }

      initializeLegacyBridge({
        getUserProfile: () => userProfile,
        setUserProfile: setUserProfileRef,
        announceRareDrop: ({ kind, tier, item, itemName }) => {
          announceRareDrop(kind, tier, itemName || item || '');
        }
      });

      const DEFAULT_CHARACTER_ID = CHARACTER_IDS.includes('waD') ? 'waD' : (CHARACTER_IDS[0] || null);
      const SPLUS_TIERS = ['SSS+', 'SS+', 'S+'];
      const DEFAULT_DRAW_PRESETS = Object.freeze({
        gear: [
          { id: 'drawBasic1', label: '기본 뽑기', count: 1, totalCost: 100, boost: 0, descriptor: '기본 확률' },
          { id: 'drawBoost1', label: '확률업 뽑기', count: 1, totalCost: 500, boost: 0.10, descriptor: 'S+ 확률 +10%p' },
          { id: 'drawPremium1', label: '프리미엄 뽑기', count: 1, totalCost: 2000, boost: 0.25, descriptor: 'S+ 확률 +25%p' },
          { id: 'drawBasic10', label: '기본 10회', count: 10, totalCost: 900, boost: 0, descriptor: '10% 할인' },
          { id: 'drawBoost10', label: '확률업 10회', count: 10, totalCost: 4500, boost: 0.10, descriptor: 'S+ 확률 +10%p' },
          { id: 'drawPremium10', label: '프리미엄 10회', count: 10, totalCost: 18000, boost: 0.25, descriptor: 'S+ 확률 +25%p' }
        ],
        character: [
          { id: 'drawCharBasic1', label: '기본 캐릭터 뽑기', count: 1, totalCost: 10000, boost: 0, descriptor: '기본 확률' },
          { id: 'drawCharBoost1', label: '확률업 캐릭터 뽑기', count: 1, totalCost: 50000, boost: 0.10, descriptor: 'S+ 확률 +10%p' },
          { id: 'drawCharPremium1', label: '프리미엄 캐릭터 뽑기', count: 1, totalCost: 200000, boost: 0.25, descriptor: 'S+ 확률 +25%p' },
          { id: 'drawCharBasic10', label: '기본 캐릭터 10회', count: 10, totalCost: 90000, boost: 0, descriptor: '10% 할인' },
          { id: 'drawCharBoost10', label: '확률업 캐릭터 10회', count: 10, totalCost: 450000, boost: 0.10, descriptor: 'S+ 확률 +10%p' },
          { id: 'drawCharPremium10', label: '프리미엄 캐릭터 10회', count: 10, totalCost: 1800000, boost: 0.25, descriptor: 'S+ 확률 +25%p' }
        ]
      });
      const GEAR_PRESET_IDS = DEFAULT_DRAW_PRESETS.gear.map((preset)=> preset.id);
      const CHARACTER_PRESET_IDS = DEFAULT_DRAW_PRESETS.character.map((preset)=> preset.id);
      function clonePreset(preset){
        return {
          id: preset.id,
          label: preset.label,
          count: preset.count,
          totalCost: preset.totalCost,
          boost: preset.boost,
          descriptor: preset.descriptor
        };
      }
      function cloneDefaultDrawPresets(){
        return {
          gear: DEFAULT_DRAW_PRESETS.gear.map(clonePreset),
          character: DEFAULT_DRAW_PRESETS.character.map(clonePreset)
        };
      }

      initializeState({
        config: {
          weights: {...defaultWeights},
          probs: {},
          characterWeights: {...defaultWeights},
          characterProbs: {},
          pity: { enabled:false, floorTier:'S', span:90 },
          minGuarantee10: { enabled:false, tier:'A' },
          seed: '', locked: false, version: cfgVersion,
          dropRates: cloneDropRates(DEFAULT_DROP_RATES),
          goldScaling: normalizeGoldScaling(DEFAULT_GOLD_SCALING),
          shopPrices: { ...DEFAULT_SHOP_PRICES },
          potionSettings: { ...DEFAULT_POTION_SETTINGS },
          hyperPotionSettings: { ...DEFAULT_HYPER_POTION_SETTINGS },
        monsterScaling: { ...DEFAULT_MONSTER_SCALING },
        difficultyAdjustments: { ...DEFAULT_DIFFICULTY_ADJUSTMENTS },
        petWeights: sanitizePetWeights(null),
        drawPresets: cloneDefaultDrawPresets(),
          rareAnimations: normalizeRareAnimations(DEFAULT_RARE_ANIMATIONS),
          characterBalance: sanitizeCharacterBalance(null)
        },
        drawSessionProbs: null,
        characterDrawProbs: null,
        session: { draws:0, counts: Object.fromEntries(TIERS.map(t=>[t,0])), history: [] },
        global: loadGlobal(),
        runId: 1,
        cancelFlag: false,
        pitySince: 0,
        inventory: [],
        equip: { head:null, body:null, main:null, off:null, boots:null },
        spares: { head:null, body:null, main:null, off:null, boots:null },
        itemSeq: 1,
        enhance: defaultEnhance(),
        gearShards: createEmptyGearShardState(),
        forge: { protectEnabled: false, protectStock: 0, autoRunning: false },
        user: null,
        ui: { adminView: false, userEditEnabled: false, statsMode: 'gear', gachaMode: 'gear', selectedCharacterDetail: null, characterDetailOpen: false, userOptionsOpen: false, questOpen: false, rareAnimationBlocking: false },
        wallet: 0,
        gold: 0,
        diamonds: 0,
        presets: { global: [], personal: [], activeGlobalId: null, activeGlobalName: null },
        selectedPreset: { scope: null, id: null },
        profile: null,
        adminUsers: [],
        backups: { mirror: null, snapshots: [] },
        timers: { manualLast: 0, autoLast: 0, uiTimer: null, autoTimer: null, autoOn: false },
        inRun: false,
        items: { potion: 0, hyperPotion: 0, protect: 0, enhance: 0, revive: 0, battleRes: 0, holyWater: 0, petTicket: 0 },
        pets: createDefaultPetState(),
        characters: createDefaultCharacterState(),
        characterStats: sanitizeCharacterDrawStats(null),
        quests: createDefaultQuestState(),
        settings: sanitizeUserSettings(null),
        petGachaWeights: sanitizePetWeights(null),
        buffs: { accelUntil: 0, accelMultiplier: 1, hyperUntil: 0, hyperMultiplier: 1 },
        combat: { useBattleRes: true, prefBattleRes: true },
        profileListener: null,
        globalConfigListener: null,
        rareAnimations: { queue: [], playing: false, timer: null, hideTimer: null, current: null, skippable: true },
        pendingProfileExtras: {},
        profileSaveStats: { recent: [], lastWarnAt: 0, lastErrorAt: 0 },
        flags: { ...DEFAULT_FLAGS },
        rewardPresets: {},
        baseConfig: null,
        admin: {
          rareInitialized: false,
          rareKind: 'gear',
          rareEdits: { gear: [], character: [] },
          rareDirty: { gear: false, character: false }
        }
      });
      state.config.petWeights = sanitizePetWeights(state.config.petWeights);
      state.petGachaWeights = sanitizePetWeights(state.config.petWeights);
      state.config.characterWeights = sanitizeWeights(state.config.characterWeights);
      state.config.characterProbs = normalize(state.config.characterWeights);
      state.config.shopPrices = normalizeShopPrices(state.config.shopPrices);
      state.config.potionSettings = normalizePotionSettings(state.config.potionSettings, DEFAULT_POTION_SETTINGS);
      state.config.hyperPotionSettings = normalizePotionSettings(state.config.hyperPotionSettings, DEFAULT_HYPER_POTION_SETTINGS);
      state.config.rareAnimations = normalizeRareAnimations(state.config.rareAnimations);
      state.config.characterBalance = sanitizeCharacterBalance(state.config.characterBalance);

      function deriveUsernameFromUser(firebaseUser){
        if(!firebaseUser) return '';
        const email = firebaseUser.email || '';
        if(email.endsWith(USERNAME_NAMESPACE)){
          return email.slice(0, -USERNAME_NAMESPACE.length);
        }
        const at = email.indexOf('@');
        if(at > 0){
          return email.slice(0, at);
        }
        return email || (firebaseUser.displayName || '');
      }

      function sanitizeUsername(raw, fallback){
        if(typeof raw === 'string' && raw.trim().length){
          return raw.trim();
        }
        return fallback || '';
      }

      function sleep(ms){ return new Promise((resolve)=> setTimeout(resolve, ms)); }

      function clonePlain(value){
        if(!value || typeof value !== 'object') return value;
        try {
          if(typeof structuredClone === 'function'){
            return structuredClone(value);
          }
        } catch {
          // ignore and fallback to JSON clone
        }
        return JSON.parse(JSON.stringify(value));
      }

      function mergePlainObjects(target, source){
        if(!target || typeof target !== 'object') target = {};
        if(!source || typeof source !== 'object') return target;
        Object.keys(source).forEach((key)=>{
          const value = source[key];
          if(value && typeof value === 'object' && !Array.isArray(value)){
            if(!target[key] || typeof target[key] !== 'object'){
              target[key] = {};
            }
            mergePlainObjects(target[key], value);
          } else {
            target[key] = clonePlain(value);
          }
        });
        return target;
      }

      function expandExtraUpdates(updates){
        if(!updates || typeof updates !== 'object') return {};
        const result = {};
        Object.keys(updates).forEach((key)=>{
          const value = updates[key];
          if(!key) return;
          if(key.includes('/')){
            const parts = key.split('/');
            let node = result;
            for(let i=0;i<parts.length;i++){
              const part = parts[i];
              if(i === parts.length-1){
                node[part] = clonePlain(value);
              } else {
                if(!node[part] || typeof node[part] !== 'object') node[part] = {};
                node = node[part];
              }
            }
          } else {
            if(value && typeof value === 'object' && !Array.isArray(value)){
              if(!result[key] || typeof result[key] !== 'object') result[key] = {};
              mergePlainObjects(result[key], value);
            } else {
              result[key] = clonePlain(value);
            }
          }
        });
        return result;
      }

      function queueProfileExtras(updates){
        if(!updates || typeof updates !== 'object') return;
        const normalized = expandExtraUpdates(updates);
        if(!Object.keys(normalized).length) return;
        if(!state.pendingProfileExtras || typeof state.pendingProfileExtras !== 'object'){
          state.pendingProfileExtras = {};
        }
        state.pendingProfileExtras = mergePlainObjects(state.pendingProfileExtras, normalized);
      }

      function collectPendingProfileExtras(){
        if(!state.pendingProfileExtras || !Object.keys(state.pendingProfileExtras).length) return null;
        const snapshot = clonePlain(state.pendingProfileExtras);
        state.pendingProfileExtras = {};
        return snapshot;
      }

      function recordProfileSaveSuccess(){
        const stats = state.profileSaveStats || (state.profileSaveStats = { recent: [], lastWarnAt: 0, lastErrorAt: 0 });
        const now = Date.now();
        stats.recent = (stats.recent || []).filter((ts)=> now - ts < 60000);
        stats.recent.push(now);
        const threshold = 20;
        if(stats.recent.length > threshold && (now - (stats.lastWarnAt || 0) > 60000)){
          stats.lastWarnAt = now;
          console.warn(`최근 60초 동안 프로필 저장이 ${stats.recent.length}회 발생했습니다. 쓰기 최적화를 검토하세요.`);
        }
      }

      function sanitizeWeights(rawWeights){
        const weights = {...defaultWeights};
        if(rawWeights && typeof rawWeights === 'object'){
          TIERS.forEach(function(tier){
            const val = rawWeights[tier];
            if(typeof val === 'number' && isFinite(val) && val >= 0){
              weights[tier] = val;
            }
          });
        }
        return weights;
      }

      function sanitizeGlobalStats(raw){
        const counts = Object.fromEntries(TIERS.map((tier)=> [tier, 0]));
        const result = { draws: 0, counts };
        if(raw && typeof raw === 'object'){
          result.draws = clampNumber(raw.draws, 0, Number.MAX_SAFE_INTEGER, 0);
          if(raw.counts && typeof raw.counts === 'object'){
            TIERS.forEach((tier)=>{
              counts[tier] = clampNumber(raw.counts[tier], 0, Number.MAX_SAFE_INTEGER, 0);
            });
          }
        }
        return result;
      }

      function sanitizeCharacterDrawStats(raw){
        const counts = Object.fromEntries(TIERS.map((tier)=> [tier, 0]));
        let draws = 0;
        if(raw && typeof raw === 'object'){
          draws = clampNumber(raw.draws, 0, Number.MAX_SAFE_INTEGER, 0);
          if(raw.counts && typeof raw.counts === 'object'){
            TIERS.forEach((tier)=>{
              counts[tier] = clampNumber(raw.counts[tier], 0, Number.MAX_SAFE_INTEGER, 0);
            });
          }
        }
        return { draws, counts };
      }

      function sanitizeFlags(raw){
        const preset = (raw && typeof raw.rewardsPreset === 'string') ? raw.rewardsPreset : 'default';
        return {
          animationsEnabled: raw && raw.animationsEnabled === false ? false : true,
          bannersEnabled: !!(raw && raw.bannersEnabled),
          rewardsPreset: preset
        };
      }

      function sanitizeRewardPresets(raw){
        const result = {};
        if(!raw || typeof raw !== 'object') return result;
        Object.keys(raw).forEach((key)=>{
          if(!key || typeof key !== 'string') return;
          const preset = raw[key];
          if(!preset || typeof preset !== 'object') return;
          const entry = {};
          if(preset.dropRates){
            entry.dropRates = normalizeDropRates(preset.dropRates);
          }
          if(preset.shopPrices){
            entry.shopPrices = normalizeShopPrices(preset.shopPrices);
          }
          result[key] = entry;
        });
        return result;
      }

      function cloneRareAnimationListSource(rawList){
        const source = Array.isArray(rawList) ? rawList : [];
        return source.map((item)=> ({
          tier: TIERS.includes(item?.tier) ? item.tier : 'SS+',
          id: typeof item?.id === 'string' ? item.id : '',
          src: typeof item?.src === 'string' ? item.src : '',
          label: typeof item?.label === 'string' ? item.label : '',
          duration: clampNumber(item?.duration, 600, 20000, RARE_ANIMATION_DURATION_MS)
        }));
      }

      function normalizeRareAnimationList(list, defaults){
        const result = [];
        const source = Array.isArray(list) ? list : [];
        source.forEach((item)=>{
          if(!item || typeof item !== 'object') return;
          const tier = TIERS.includes(item.tier) ? item.tier : null;
          const src = typeof item.src === 'string' && item.src.trim().length ? item.src.trim() : null;
          if(!tier || !src) return;
          const label = typeof item.label === 'string' && item.label.trim().length ? item.label.trim() : `${tier} 획득!`;
          const duration = clampNumber(item.duration, 600, 20000, RARE_ANIMATION_DURATION_MS);
          const id = typeof item.id === 'string' && item.id.trim().length ? item.id.trim() : null;
          const entry = { tier, src, label, duration };
          if(id) entry.id = id;
          result.push(entry);
        });
        if(result.length === 0 && Array.isArray(defaults)){
          defaults.forEach((item)=>{
            if(!item || typeof item !== 'object') return;
            const tier = TIERS.includes(item.tier) ? item.tier : null;
            const src = typeof item.src === 'string' && item.src.trim().length ? item.src.trim() : null;
            if(!tier || !src) return;
            const label = typeof item.label === 'string' && item.label.trim().length ? item.label.trim() : `${tier} 획득!`;
            const duration = clampNumber(item.duration, 600, 20000, RARE_ANIMATION_DURATION_MS);
            const id = typeof item.id === 'string' && item.id.trim().length ? item.id.trim() : null;
            const entry = { tier, src, label, duration };
            if(id) entry.id = id;
            result.push(entry);
          });
        }
        return result;
      }

      function normalizeRareAnimations(raw){
        const result = {};
        const kinds = new Set(Object.keys(DEFAULT_RARE_ANIMATIONS));
        if(raw && typeof raw === 'object'){
          Object.keys(raw).forEach((kind)=> kinds.add(kind));
        }
        kinds.forEach((kind)=>{
          const defaults = DEFAULT_RARE_ANIMATIONS[kind] || [];
          const list = normalizeRareAnimationList(raw && raw[kind], defaults);
          const ensureEntry = (tier, gif, label, legacySrc)=>{
            const idx = list.findIndex((entry)=> entry && entry.tier === tier && !entry.id);
            if(idx === -1){
              list.push({ tier, src: gif, label, duration: RARE_ANIMATION_DURATION_MS });
              return;
            }
            const current = list[idx];
            if(current.src === legacySrc){
              current.src = gif;
            }
            if(!current.label || !current.label.trim()){
              current.label = label;
            }
            current.duration = clampNumber(current.duration, 600, 20000, RARE_ANIMATION_DURATION_MS);
          };
          if(kind === 'gear'){
            ensureEntry('SS+', GEAR_SSPLUS_GIF, 'SS+ 장비 획득!', LEGACY_GEAR_RARE_GIF);
            ensureEntry('SSS+', GEAR_SSSPLUS_GIF, 'SSS+ 장비 획득!', LEGACY_GEAR_RARE_GIF);
          } else if(kind === 'character'){
            ensureEntry('SS+', CHARACTER_SSPLUS_GIF, 'SS+ 캐릭터 획득!', LEGACY_CHARACTER_RARE_GIF);
            ensureEntry('SSS+', CHARACTER_SSSPLUS_GIF, 'SSS+ 캐릭터 획득!', LEGACY_CHARACTER_RARE_GIF);
          }
          if(kind === 'gear' || kind === 'character'){
            list.sort((a,b)=>{
              const ai = TIER_INDEX[a.tier] ?? Number.POSITIVE_INFINITY;
              const bi = TIER_INDEX[b.tier] ?? Number.POSITIVE_INFINITY;
              return ai - bi;
            });
          }
          result[kind] = list;
        });
        return result;
      }

      function composeActiveConfig(){
        const base = clonePlain(state.baseConfig || state.config || {});
        const presetId = state.flags?.rewardsPreset;
        if(presetId && presetId !== 'default'){
          const preset = state.rewardPresets?.[presetId];
          if(preset){
            if(preset.dropRates){
              base.dropRates = normalizeDropRates(preset.dropRates);
            }
            if(preset.shopPrices){
              base.shopPrices = normalizeShopPrices(preset.shopPrices);
            }
          }
        }
        state.config = base;
      }

      function updateFlagControls(){
        if(!isAdmin()) return;
        if(els.flagAnimations){
          els.flagAnimations.checked = !!(state.flags?.animationsEnabled !== false);
        }
        if(els.flagBanners){
          els.flagBanners.checked = !!state.flags?.bannersEnabled;
        }
        if(els.flagRewardsPreset){
          const select = els.flagRewardsPreset;
          const current = state.flags?.rewardsPreset || 'default';
          const presets = state.rewardPresets || {};
          const existing = new Set();
          Array.from(select.options).forEach((opt)=> existing.add(opt.value));
          const desired = new Set(['default', ...Object.keys(presets)]);
          if(existing.size !== desired.size || Array.from(existing).some((v)=> !desired.has(v))){
            select.innerHTML = '';
            const defOpt = document.createElement('option');
            defOpt.value = 'default';
            defOpt.textContent = '기본 설정';
            select.appendChild(defOpt);
            Object.keys(presets).forEach((id)=>{
              const opt = document.createElement('option');
              opt.value = id;
              opt.textContent = id;
              select.appendChild(opt);
            });
          }
          if(!desired.has(current)){
            state.flags.rewardsPreset = 'default';
          }
          select.value = state.flags.rewardsPreset || 'default';
        }
        if(els.adminFlagMsg){
          const preset = state.flags?.rewardsPreset && state.flags.rewardsPreset !== 'default'
            ? `보상 프리셋 적용: ${state.flags.rewardsPreset}`
            : '';
          const animOff = state.flags?.animationsEnabled === false ? '희귀 연출 비활성화됨' : '';
          const notes = [preset, animOff].filter(Boolean);
          els.adminFlagMsg.textContent = notes.join(' · ');
        }
      }

      function applyFlags(rawFlags, options){
        const previous = state.flags || DEFAULT_FLAGS;
        const sanitized = sanitizeFlags(rawFlags);
        if(sanitized.rewardsPreset !== 'default' && !(state.rewardPresets?.[sanitized.rewardsPreset])){
          sanitized.rewardsPreset = 'default';
        }
        state.flags = sanitized;
        if(sanitized.animationsEnabled === false){
          clearRareAnimations({ immediate: true });
        }
        const presetChanged = previous.rewardsPreset !== sanitized.rewardsPreset || options?.forceCompose;
        updateFlagControls();
        if(presetChanged){
          composeActiveConfig();
        }
        if(presetChanged && options?.reflect !== false){
          refreshRareAnimationEditor({ force: true });
          reflectConfig();
        }
      }

      async function saveFlags(overrides){
        if(!isAdmin()) return;
        const current = state.flags || DEFAULT_FLAGS;
        const proposed = sanitizeFlags({ ...current, ...overrides });
        if(proposed.rewardsPreset !== 'default' && !(state.rewardPresets?.[proposed.rewardsPreset])){
          proposed.rewardsPreset = 'default';
        }
        const presetChanged = current.rewardsPreset !== proposed.rewardsPreset;
        const message = presetChanged ? `보상 테이블을 '${proposed.rewardsPreset}'로 전환했습니다.` : '설정이 업데이트되었습니다.';
        const previous = current;
        applyFlags(proposed, { reflect: presetChanged });
        try {
          await update(ref(db, GLOBAL_CONFIG_PATH), { flags: proposed, updatedAt: Date.now() });
          if(els.adminFlagMsg){
            const note = els.adminFlagMsg.textContent;
            els.adminFlagMsg.textContent = note ? `${note}` : '';
          }
          setRareAnimMessage('', null);
          if(els.rareAnimStatus) updateRareAnimStatus();
          if(els.adminFlagMsg && message){
            els.adminFlagMsg.textContent = message;
          }
          if(presetChanged){
            refreshRareAnimationEditor({ force: true });
            reflectConfig();
          }
        } catch (error) {
          console.error('플래그 저장 실패', error);
          applyFlags(previous, { reflect: presetChanged });
          if(els.adminFlagMsg){
            els.adminFlagMsg.textContent = '설정 저장에 실패했습니다.';
          }
        }
      }

      function sanitizeConfig(raw){
        const weights = sanitizeWeights(raw && raw.weights);
        const characterWeights = sanitizeWeights(raw && (raw.characterWeights || raw.characterGachaWeights));
        const pityRaw = raw && raw.pity ? raw.pity : {};
        const min10Raw = raw && raw.minGuarantee10 ? raw.minGuarantee10 : {};
        const pityFloor = TIERS.includes(pityRaw.floorTier) ? pityRaw.floorTier : 'S';
        const min10Tier = TIERS.includes(min10Raw.tier) ? min10Raw.tier : 'A';
        const pitySpan = clampNumber(pityRaw.span, 1, 9999, 90);
        const petWeights = sanitizePetWeights(raw && (raw.petWeights || raw.petGachaWeights));
        const monsterScaling = normalizeMonsterScaling(raw && raw.monsterScaling);
        let difficultyAdjustments = sanitizeDifficultyAdjustments(raw && raw.difficultyAdjustments);
        if(!raw || raw.difficultyAdjustments === undefined){
          const rawMultiplier = raw && raw.monsterScaling && raw.monsterScaling.difficultyMultiplier;
          if(rawMultiplier === 1 && monsterScaling.difficultyMultiplier === 1){
            monsterScaling.difficultyMultiplier = DEFAULT_MONSTER_SCALING.difficultyMultiplier;
            difficultyAdjustments = { ...DEFAULT_DIFFICULTY_ADJUSTMENTS };
          }
        }
        return {
          weights,
          probs: normalize(weights),
          characterWeights,
          characterProbs: normalize(characterWeights),
          seed: (raw && typeof raw.seed === 'string') ? raw.seed : '',
          locked: !!(raw && raw.locked),
          pity: {
            enabled: !!pityRaw.enabled,
            floorTier: pityFloor,
            span: pitySpan || 90
          },
          minGuarantee10: {
            enabled: !!min10Raw.enabled,
            tier: min10Tier
          },
          version: (raw && typeof raw.version === 'string') ? raw.version : cfgVersion,
          dropRates: normalizeDropRates(raw && raw.dropRates),
          goldScaling: normalizeGoldScaling(raw && raw.goldScaling),
          shopPrices: normalizeShopPrices(raw && raw.shopPrices),
          potionSettings: normalizePotionSettings(raw && raw.potionSettings, DEFAULT_POTION_SETTINGS),
          hyperPotionSettings: normalizePotionSettings(raw && raw.hyperPotionSettings, DEFAULT_HYPER_POTION_SETTINGS),
          monsterScaling,
          difficultyAdjustments,
          petWeights,
          drawPresets: sanitizeDrawPresets(raw && raw.drawPresets),
          rareAnimations: normalizeRareAnimations(raw && raw.rareAnimations),
          characterBalance: sanitizeCharacterBalance(raw && raw.characterBalance)
        };
      }

      function sanitizeGearItem(raw){
        if(!raw || typeof raw !== 'object') return null;
        const tier = TIERS.includes(raw.tier) ? raw.tier : null;
        const part = PART_KEYS.includes(raw.part) ? raw.part : null;
        if(!tier || !part) return null;
        const defType = PART_DEFS.find(p=>p.key===part)?.type || 'atk';
        return {
          id: clampNumber(raw.id, 0, Number.MAX_SAFE_INTEGER, Date.now()),
          tier,
          part,
          base: clampNumber(raw.base ?? raw.stat, 0, Number.MAX_SAFE_INTEGER, 0),
          lvl: clampEnhancementLevel(raw.lvl || 0),
          progress: clampEnhancementProgress(raw.lvl || 0, raw.progress || 0),
          type: (raw.type === 'atk' || raw.type === 'def') ? raw.type : defType
        };
      }

      function sanitizeEquipMap(raw){
        const result = { head:null, body:null, main:null, off:null, boots:null };
        if(raw && typeof raw === 'object'){
          PART_KEYS.forEach(function(key){
            result[key] = sanitizeGearItem(raw[key]);
          });
        }
        return result;
      }

      function ensureCharacterBalanceConfig(){
        const sanitized = sanitizeCharacterBalance(state.config.characterBalance);
        state.config.characterBalance = sanitized;
        if(userProfile?.config){
          userProfile.config.characterBalance = sanitized;
        }
        return sanitized;
      }

      function setCharacterBalanceMsg(message, tone){
        if(!els.characterBalanceMsg) return;
        els.characterBalanceMsg.textContent = message || '';
        els.characterBalanceMsg.classList.remove('ok','warn','danger');
        if(tone === 'ok') els.characterBalanceMsg.classList.add('ok');
        else if(tone === 'warn') els.characterBalanceMsg.classList.add('warn');
        else if(tone === 'danger') els.characterBalanceMsg.classList.add('danger');
      }

      function updateCharacterBalanceInputs(){
        if(!els.characterBalanceTable) return;
        const balance = ensureCharacterBalanceConfig();
        els.characterBalanceTable.querySelectorAll('input[data-class][data-field]').forEach((input)=>{
          const classId = input.dataset.class;
          const field = input.dataset.field;
          const entry = balance[classId] || DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior;
          let value = 1;
          if(field === 'skill'){
            value = entry.skill ?? 1;
          } else if(entry.stats && field in entry.stats){
            value = entry.stats[field];
          }
          input.value = formatMultiplier(value ?? 1);
          input.placeholder = formatMultiplier(value ?? 1);
        });
        if(els.characterBalanceOffsetTable){
          els.characterBalanceOffsetTable.querySelectorAll('input[data-class][data-field]').forEach((input)=>{
            const classId = input.dataset.class;
            const field = input.dataset.field;
            const entry = balance[classId] || DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior;
            const offsets = entry.offsets || {};
            let value = offsets[field];
            if(!Number.isFinite(value)) value = 0;
            input.value = value;
            input.placeholder = formatOffsetDisplay(field, value);
          });
        }
        renderCharacterBalanceSnapshot();
      }

      function renderCharacterBalanceSnapshot(){
        if(!els.characterBalanceSnapshot) return;
        const balance = ensureCharacterBalanceConfig();
        const content = CHARACTER_CLASS_IDS.map((classId) => {
          const entry = balance[classId] || DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior;
          const skillMultiplier = formatMultiplier(entry.skill ?? 1);
          const statMultipliers = entry.stats || {};
          const statOffsets = entry.offsets || {};
          const rows = TIERS.map((tier) => {
            const def = findCharacterDefinitionForSnapshot(classId, tier);
            if(!def) return '';
            const baseStats = def.stats || {};
            return `<tr>
              <td>${tier}</td>
              ${CHARACTER_SNAPSHOT_FIELDS.map((field) => `<td>${formatSnapshotCell(baseStats[field.key], Number(statMultipliers[field.key] ?? 1), Number(statOffsets[field.key] ?? 0), field.type)}</td>`).join('')}
            </tr>`;
          }).filter(Boolean).join('');
          if(!rows) return '';
          const classLabel = CLASS_LABELS[classId] || classId;
          return `
            <div class="balance-snapshot-class">
              <div class="balance-snapshot-header"><strong>${classLabel}</strong><span>스킬 배율 ${skillMultiplier}×</span></div>
              <table class="stats balance-snapshot-table">
                <thead>
                  <tr><th>티어</th>${CHARACTER_SNAPSHOT_FIELDS.map((field) => `<th>${field.label}</th>`).join('')}</tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        }).filter(Boolean).join('');
        els.characterBalanceSnapshot.innerHTML = content || '<p class="muted">표시할 캐릭터 정보가 없습니다.</p>';
      }

      const CHARACTER_SNAPSHOT_FIELDS = [
        { key: 'hp', label: 'HP', type: 'flat' },
        { key: 'atk', label: 'ATK', type: 'flat' },
        { key: 'def', label: 'DEF', type: 'flat' },
        { key: 'speed', label: 'SPD', type: 'flat' },
        { key: 'critRate', label: 'CRI', type: 'percent' },
        { key: 'critDmg', label: 'CRIT DMG', type: 'percent' },
        { key: 'dodge', label: 'DODGE', type: 'percent' }
      ];

      function formatOffsetDisplay(field, value){
        if(!Number.isFinite(value)) return '0';
        if(value === 0){
          if(field === 'critRate' || field === 'critDmg' || field === 'dodge') return '0%p';
          return '0';
        }
        const sign = value > 0 ? '+' : '-';
        const absValue = Math.abs(value);
        if(field === 'critRate' || field === 'critDmg' || field === 'dodge'){
          const rounded = Math.round(absValue * 10) / 10;
          return `${sign}${rounded}%p`;
        }
        const absText = absValue.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
        return `${sign}${absText}`;
      }

      function findCharacterDefinitionForSnapshot(classId, tier){
        const ids = CHARACTER_IDS_BY_TIER[tier] || [];
        for(const id of ids){
          const def = getCharacterDefinition(id);
          if(def?.classId === classId){
            return def;
          }
        }
        return null;
      }

      function formatSnapshotCell(baseValue, multiplier, offset, type, showDetails = true){
        if(!(typeof baseValue === 'number' && isFinite(baseValue))) return '-';
        const safeMultiplier = typeof multiplier === 'number' && isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
        const safeOffset = typeof offset === 'number' && isFinite(offset) ? offset : 0;
        const adjusted = baseValue * safeMultiplier + safeOffset;
        if(type === 'percent'){
          const baseRounded = Math.round(baseValue * 10) / 10;
          const adjustedRounded = Math.round(adjusted * 10) / 10;
          const baseText = `${baseRounded}%`;
          const adjustedText = `${adjustedRounded}%`;
          if(!showDetails || Math.abs(adjusted - baseValue) < 0.001){
            return adjustedText;
          }
          const delta = adjustedRounded - baseRounded;
          const deltaText = delta === 0 ? '' : ` (${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}%p)`;
          return `${adjustedText} <span class="muted">(기본 ${baseText}${deltaText})</span>`;
        }
        const baseText = baseValue.toLocaleString('ko-KR');
        const adjustedText = adjusted.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
        if(!showDetails || Math.abs(adjusted - baseValue) < 0.001){
          return adjustedText;
        }
        const delta = adjusted - baseValue;
        const deltaAbs = Math.abs(delta).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
        const deltaText = delta === 0 ? '' : ` (${delta > 0 ? '+' : ''}${deltaAbs})`;
        return `${adjustedText} <span class="muted">(기본 ${baseText}${deltaText})</span>`;
      }

      function refreshCharacterBalanceEffects(){
        updateInventoryView();
        updateCharacterList();
        renderCharacterStats();
        syncStats();
        drawChart();
        updateWinProbView();
      }

      function handleCharacterBalanceInput(event){
        const target = event.target;
        if(!(target instanceof HTMLInputElement)) return;
        const classId = target.dataset.class;
        const field = target.dataset.field;
        if(!classId || !field) return;
        if(state.config.locked || !isAdmin()){
          updateCharacterBalanceInputs();
          setCharacterBalanceMsg('설정이 잠겨 있어 수정할 수 없습니다.', 'warn');
          return;
        }
        let value = parseFloat(target.value);
        if(!Number.isFinite(value)) value = 1;
        if(value < 0) value = 0;
        const balance = ensureCharacterBalanceConfig();
        const entry = balance[classId] || (balance[classId] = JSON.parse(JSON.stringify(DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior)));
        if(field === 'skill'){
          entry.skill = value;
        } else if(entry.stats && field in entry.stats){
          entry.stats[field] = value;
        }
        state.config.characterBalance = balance;
        if(userProfile?.config){
          userProfile.config.characterBalance = balance;
        }
        if(isAdmin()){
          persistGlobalConfig(state.config, { activePresetId: state.presets.activeGlobalId, activePresetName: state.presets.activeGlobalName });
        }
        updateCharacterBalanceInputs();
        const label = CLASS_LABELS[classId] || classId;
        const fieldLabel = (CHARACTER_BALANCE_FIELDS.find((f)=>f.key === field)?.label) || field.toUpperCase();
        setCharacterBalanceMsg(`${label} ${fieldLabel} 배율을 ${formatMultiplier(value)}로 설정했습니다.`, 'ok');
        markProfileDirty();
        refreshCharacterBalanceEffects();
      }

      function handleCharacterBalanceOffsetInput(event){
        const target = event.target;
        if(!(target instanceof HTMLInputElement)) return;
        const classId = target.dataset.class;
        const field = target.dataset.field;
        if(!classId || !field) return;
        if(state.config.locked || !isAdmin()){
          updateCharacterBalanceInputs();
          setCharacterBalanceMsg('설정이 잠겨 있어 수정할 수 없습니다.', 'warn');
          return;
        }
        let value = parseFloat(target.value);
        if(!Number.isFinite(value)) value = 0;
        const balance = ensureCharacterBalanceConfig();
        const entry = balance[classId] || (balance[classId] = JSON.parse(JSON.stringify(DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior)));
        if(!entry.offsets) entry.offsets = JSON.parse(JSON.stringify(DEFAULT_CHARACTER_BALANCE[classId].offsets));
        entry.offsets[field] = value;
        state.config.characterBalance = balance;
        if(userProfile?.config){
          userProfile.config.characterBalance = balance;
        }
        if(isAdmin()){
          persistGlobalConfig(state.config, { activePresetId: state.presets.activeGlobalId, activePresetName: state.presets.activeGlobalName });
        }
        updateCharacterBalanceInputs();
        const label = CLASS_LABELS[classId] || classId;
        const fieldLabel = (CHARACTER_BALANCE_FIELDS.find((f)=>f.key === field)?.label) || field.toUpperCase();
        setCharacterBalanceMsg(`${label} ${fieldLabel} 보정을 ${formatOffsetDisplay(field, value)}로 설정했습니다.`, 'ok');
        markProfileDirty();
        refreshCharacterBalanceEffects();
      }

      function sanitizeItems(raw){
        const template = { potion:0, hyperPotion:0, protect:0, enhance:0, revive:0, battleRes:0, holyWater:0, petTicket:0 };
        const result = {...template};
        if(raw && typeof raw === 'object'){
          Object.keys(template).forEach(function(key){
            result[key] = clampNumber(raw[key], 0, Number.MAX_SAFE_INTEGER, 0);
          });
        }
        return result;
      }

      function isLegacyMultipliers(arr){
        if(!Array.isArray(arr) || arr.length !== 21) return false;
        for(let lv=1; lv<=19; lv++){
          const expected = 1 + 0.1 * lv;
          if(Math.abs((arr[lv] || 0) - expected) > 1e-4) return false;
        }
        return Math.abs((arr[20] || 0) - 21) <= 1e-3;
      }

      function isLegacyProbs(arr){
        if(!Array.isArray(arr) || arr.length !== 21) return false;
        for(let lv=1; lv<=20; lv++){
          const expected = 0.99 - ((lv - 1) * (0.99 - 0.001)) / 19;
          if(Math.abs((arr[lv] || 0) - expected) > 1e-4) return false;
        }
        return true;
      }

      function sanitizeEnhanceConfig(raw){
        const base = defaultEnhance();
        if(!raw || typeof raw !== 'object') return base;

        const useLegacyMultipliers = isLegacyMultipliers(raw.multipliers);
        const useLegacyProbs = isLegacyProbs(raw.probs);

        if(!useLegacyMultipliers && Array.isArray(raw.multipliers) && raw.multipliers.length === base.multipliers.length){
          base.multipliers = base.multipliers.map(function(def, idx){
            const val = raw.multipliers[idx];
            return (typeof val === 'number' && isFinite(val) && val > 0) ? val : def;
          });
        }

        if(!useLegacyProbs && Array.isArray(raw.probs) && raw.probs.length === base.probs.length){
          base.probs = base.probs.map(function(def, idx){
            const val = raw.probs[idx];
            if(typeof val === 'number' && isFinite(val) && val >= 0 && val <= 1){
              return val;
            }
            return def;
          });
        }

        return base;
      }

      function sanitizeSession(raw){
        const counts = Object.fromEntries(TIERS.map(t=>[t,0]));
        const result = { draws: 0, counts, history: [] };
        if(raw && typeof raw === 'object'){
          result.draws = clampNumber(raw.draws, 0, Number.MAX_SAFE_INTEGER, 0);
          if(raw.counts && typeof raw.counts === 'object'){
            TIERS.forEach(function(tier){
              counts[tier] = clampNumber(raw.counts[tier], 0, Number.MAX_SAFE_INTEGER, 0);
            });
          }
          if(Array.isArray(raw.history)){
            result.history = raw.history.slice(-500).map(function(entry, idx){
              if(!entry || typeof entry !== 'object') return null;
              const tier = TIERS.includes(entry.tier) ? entry.tier : 'D';
              const part = PART_KEYS.includes(entry.part) ? entry.part : 'head';
              return {
                id: clampNumber(entry.id, 0, Number.MAX_SAFE_INTEGER, idx+1),
                tier,
                ts: clampNumber(entry.ts, 0, Number.MAX_SAFE_INTEGER, Date.now()),
                runId: clampNumber(entry.runId, 0, Number.MAX_SAFE_INTEGER, 0),
                cfgHash: typeof entry.cfgHash === 'string' ? entry.cfgHash : '',
                part,
                stat: clampNumber(entry.stat, 0, Number.MAX_SAFE_INTEGER, 0)
              };
            }).filter(Boolean);
          }
        }
        return result;
      }

      function sanitizePresetName(raw, fallback){
        if(typeof raw === 'string' && raw.trim().length){
          const name = raw.trim();
          return name.length > 60 ? name.slice(0, 60) : name;
        }
        return fallback || '프리셋';
      }

      function sanitizePresetRecord(id, raw, fallbackName){
        if(!raw || typeof raw !== 'object') return null;
        const config = sanitizeConfig(raw.config || raw);
        const name = sanitizePresetName(raw.name, fallbackName);
        const createdAt = clampNumber(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now());
        const updatedAt = clampNumber(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER, createdAt);
        const createdBy = typeof raw.createdBy === 'string' ? raw.createdBy : null;
        return { id, name, config, createdAt, updatedAt, createdBy };
      }

      function sanitizePresetList(raw){
        const list = [];
        if(raw && typeof raw === 'object'){
          Object.keys(raw).forEach(function(id){
            const preset = sanitizePresetRecord(id, raw[id]);
            if(preset) list.push(preset);
          });
        }
        list.sort(function(a,b){ return (b.updatedAt||0) - (a.updatedAt||0); });
        return list;
      }

      function sanitizeUserPresets(raw){
        return sanitizePresetList(raw);
      }

      function personalPresetsToMap(list){
        const out = {};
        list.forEach(function(preset){
          out[preset.id] = {
            name: preset.name,
            config: sanitizeConfig(preset.config),
            createdAt: preset.createdAt,
            updatedAt: preset.updatedAt,
            createdBy: preset.createdBy || null
          };
        });
        return out;
      }

      function sanitizeSelectedPreset(raw){
        if(!raw || typeof raw !== 'object') return { scope: null, id: null };
        const scope = raw.scope === 'global' || raw.scope === 'personal' ? raw.scope : null;
        const id = typeof raw.id === 'string' && raw.id.trim().length ? raw.id.trim() : null;
        return { scope, id };
      }

      function generatePresetId(prefix){
        const base = typeof prefix === 'string' && prefix.length ? prefix : 'preset';
        if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'){
          return `${base}-${crypto.randomUUID()}`;
        }
        return `${base}-${Date.now().toString(36)}-${Math.floor(Math.random()*1e6).toString(36)}`;
      }

      async function loadGlobalPresets(){ try {
          const snapshot = await get(ref(db, 'config/presets'));
          const list = snapshot.exists() ? sanitizePresetList(snapshot.val()) : [];
          state.presets.global = list;
          refreshPresetSelectors();
        } catch (error) {
          console.error('프리셋 목록을 불러오지 못했습니다.', error);
          setAdminPresetMsg('프리셋 목록을 불러오지 못했습니다.', 'error');
        }
      }

      function refreshPresetSelectors(){
        updateAdminPresetSelector();
        updateUserPresetSelectors();
      }

      function updateAdminPresetSelector(){ const select = els.adminPresetSelect; if(!select) return; const activeId = state.presets.activeGlobalId; const currentValue = select.value; select.innerHTML=''; const placeholder = document.createElement('option'); placeholder.value=''; placeholder.textContent = state.presets.global.length? '프리셋 선택':'프리셋 없음'; select.appendChild(placeholder); state.presets.global.forEach(function(preset){ const opt = document.createElement('option'); opt.value = preset.id; opt.textContent = preset.name + (preset.id === activeId ? ' (적용중)' : ''); select.appendChild(opt); }); if(state.presets.global.some(function(p){ return p.id === currentValue; })){ select.value = currentValue; } else if(activeId && state.presets.global.some(function(p){ return p.id === activeId; })){ select.value = activeId; }
      }

      function updateUserPresetSelectors(){ const globalSelect = els.globalPresetSelect; if(globalSelect){ const prev = globalSelect.value; globalSelect.innerHTML=''; const none = document.createElement('option'); none.value=''; none.textContent='선택 안함'; globalSelect.appendChild(none); state.presets.global.forEach(function(preset){ const opt = document.createElement('option'); opt.value = preset.id; opt.textContent = preset.name; globalSelect.appendChild(opt); }); const preferred = state.selectedPreset.scope==='global'? state.selectedPreset.id : (state.presets.activeGlobalId||''); if(preferred && state.presets.global.some(function(p){ return p.id===preferred; })){ globalSelect.value = preferred; } else if(state.presets.global.some(function(p){ return p.id===prev; })){ globalSelect.value = prev; } else { globalSelect.value=''; }
        }
        const personalSelect = els.personalPresetSelect; if(personalSelect){ const prev = personalSelect.value; personalSelect.innerHTML=''; const none = document.createElement('option'); none.value=''; none.textContent='선택 안함'; personalSelect.appendChild(none); state.presets.personal.forEach(function(preset){ const opt = document.createElement('option'); opt.value = preset.id; opt.textContent = preset.name; personalSelect.appendChild(opt); }); if(state.selectedPreset.scope==='personal' && state.presets.personal.some(function(p){ return p.id===state.selectedPreset.id; })){ personalSelect.value = state.selectedPreset.id; } else if(state.presets.personal.some(function(p){ return p.id===prev; })){ personalSelect.value = prev; } else { personalSelect.value=''; }
        }
        updateDiamondsView();
      }

      function clearActivePreset(){ state.presets.activeGlobalId = null; state.presets.activeGlobalName = null; updateAdminPresetSelector(); }

      function clearSelectedPreset(){ state.selectedPreset = { scope:null, id:null }; if(userProfile){ userProfile.selectedPreset = null; if(!isAdmin()) markProfileDirty(); }
        if(!isAdmin()) state.ui.userEditEnabled = false;
        updateUserPresetSelectors();
        updateUserEditModeView();
        toggleConfigDisabled(); }

      function findGlobalPreset(id){ if(!id) return null; return state.presets.global.find(function(p){ return p.id === id; }) || null; }

      function findPersonalPreset(id){ if(!id) return null; return state.presets.personal.find(function(p){ return p.id === id; }) || null; }

      function setConfigFromPreset(preset){ if(!preset) return; state.config = sanitizeConfig(preset.config); userProfile.config = state.config; reflectConfig(); updateWeightsInputs(); refreshProbsAndStats(); if(!isAdmin()) state.ui.userEditEnabled = false; updateUserEditModeView(); toggleConfigDisabled(); markProfileDirty(); }

      function updateUserEditModeView(){ if(isAdmin()){ state.ui.userEditEnabled = true; if(els.toggleUserEdit) els.toggleUserEdit.style.display = 'none'; return; }
        if(els.toggleUserEdit){ els.toggleUserEdit.style.display=''; els.toggleUserEdit.textContent = state.ui.userEditEnabled ? '설정 편집 모드 해제' : '설정 편집 모드'; }
      }

      async function applyAdminPreset(preset){ if(!isAdmin() || !preset) return; setConfigFromPreset(preset); state.presets.activeGlobalId = preset.id; state.presets.activeGlobalName = preset.name; await persistGlobalConfig(state.config, { activePresetId: preset.id, activePresetName: preset.name }); updateAdminPresetSelector(); updateUserPresetSelectors(); markProfileDirty(); setAdminPresetMsg(`'${preset.name}' 프리셋을 전역 설정으로 적용했습니다.`, 'ok'); }

      function loadAdminPresetForEditing(preset){ if(!isAdmin() || !preset) return; setConfigFromPreset(preset); clearActivePreset(); setAdminPresetMsg(`'${preset.name}' 프리셋을 불러왔습니다. 적용하려면 저장 또는 프리셋 적용을 실행하세요.`, 'warn'); }

      function applyGlobalPresetForUser(preset, options){ if(!preset) return false; const silent = !!(options && options.silent); setConfigFromPreset(preset); state.selectedPreset = { scope:'global', id: preset.id }; if(userProfile){ userProfile.selectedPreset = { scope:'global', id: preset.id }; } updateUserPresetSelectors(); if(!silent){ setPresetMsg(`'${preset.name}' 프리셋을 적용했습니다.`, 'ok'); markProfileDirty(); } return true; }

      function applyPersonalPresetForUser(preset, options){ if(!preset) return false; const silent = !!(options && options.silent); setConfigFromPreset(preset); state.selectedPreset = { scope:'personal', id: preset.id }; if(userProfile){ userProfile.selectedPreset = { scope:'personal', id: preset.id }; } updateUserPresetSelectors(); if(!silent){ setPresetMsg(`나의 프리셋 '${preset.name}'을 적용했습니다.`, 'ok'); markProfileDirty(); } return true; }

      function applySelectedPresetIfAvailable(isAdminRole){ if(isAdminRole) { updateUserPresetSelectors(); return; } if(state.selectedPreset.scope === 'personal'){ const preset = findPersonalPreset(state.selectedPreset.id); if(preset){ applyPersonalPresetForUser(preset, {silent:true}); return; } clearSelectedPreset(); return; } if(state.selectedPreset.scope === 'global'){ const preset = findGlobalPreset(state.selectedPreset.id); if(preset){ applyGlobalPresetForUser(preset, {silent:true}); return; } clearSelectedPreset(); return; } updateUserPresetSelectors(); }

      async function handleAdminPresetSave(){ if(!isAdmin()) return; const nameRaw = els.adminPresetName?.value || ''; const name = sanitizePresetName(nameRaw, '새 프리셋'); if(!name.trim()){ setAdminPresetMsg('프리셋 이름을 입력하세요.', 'warn'); return; } const id = generatePresetId('preset'); const now = Date.now(); const payload = { name, config: sanitizeConfig(state.config), createdAt: now, updatedAt: now, createdBy: state.user ? state.user.uid : null }; try {
          await set(ref(db, `config/presets/${id}`), payload);
          if(els.adminPresetName) els.adminPresetName.value = '';
          setAdminPresetMsg('프리셋을 저장했습니다.', 'ok');
          await loadGlobalPresets();
        } catch (error) {
          console.error('프리셋 저장 실패', error);
          setAdminPresetMsg('프리셋 저장에 실패했습니다.', 'error');
        }
      }

      async function handleAdminPresetDelete(){ if(!isAdmin()) return; const id = els.adminPresetSelect?.value || ''; if(!id){ setAdminPresetMsg('삭제할 프리셋을 선택하세요.', 'warn'); return; } try {
          await set(ref(db, `config/presets/${id}`), null);
          if(state.selectedPreset.scope === 'global' && state.selectedPreset.id === id){
            clearSelectedPreset();
          }
          if(state.presets.activeGlobalId === id){
            clearActivePreset();
            await persistGlobalConfig(state.config, { activePresetId: null, activePresetName: null });
          }
          setAdminPresetMsg('프리셋을 삭제했습니다.', 'ok');
          await loadGlobalPresets();
        } catch (error) {
          console.error('프리셋 삭제 실패', error);
          setAdminPresetMsg('프리셋 삭제에 실패했습니다.', 'error');
        }
      }

      async function handleSavePersonalPreset(){ if(isAdmin()){ setPresetMsg('관리자는 개인 프리셋을 만들 필요가 없습니다.', 'warn'); return; }
        if(!userProfile){ setPresetMsg('사용자 정보를 불러오지 못했습니다.', 'error'); return; }
        if(!spendDiamonds(1)){ setPresetMsg('다이아가 부족합니다.', 'error'); return; }
        const nameRaw = els.personalPresetName?.value || ''; const name = sanitizePresetName(nameRaw, '나의 프리셋'); const id = generatePresetId('my'); const now = Date.now(); const record = { id, name, config: sanitizeConfig(state.config), createdAt: now, updatedAt: now, createdBy: state.user ? state.user.uid : null };
        state.presets.personal.push(record);
        state.presets.personal.sort(function(a,b){ return (b.updatedAt||0) - (a.updatedAt||0); });
        state.selectedPreset = { scope:'personal', id };
        userProfile.presets = personalPresetsToMap(state.presets.personal);
        userProfile.selectedPreset = { scope:'personal', id };
        updateUserPresetSelectors();
        if(els.personalPresetName) els.personalPresetName.value = '';
        setPresetMsg(`나의 프리셋 '${record.name}'을 저장했습니다.`, 'ok');
        markProfileDirty();
      }

      async function loadAdminUsers(){ if(!isAdmin()) return; try {
          const snapshot = await get(ref(db, 'users'));
          const list = [];
          if(snapshot.exists()){
            const raw = snapshot.val();
            Object.keys(raw).forEach(function(uid){
              const info = raw[uid] || {};
              const role = info.role || 'user';
              const wallet = typeof info.wallet === 'number' ? info.wallet : null;
              const gold = typeof info.gold === 'number' ? info.gold : null;
              const diamonds = clampNumber(info.diamonds, 0, Number.MAX_SAFE_INTEGER, 0);
              const username = sanitizeUsername(info.username, uid);
              const items = sanitizeItems(info.items);
              const petTickets = items.petTicket || 0;
              list.push({ uid, username, role, wallet, gold, diamonds, petTickets });
            });
          }
          list.sort(function(a,b){ return a.username.localeCompare(b.username, 'ko-KR', { sensitivity:'base', numeric:true }); });
          state.adminUsers = list;
          populateAdminUserSelect();
          await refreshAdminBackups({ silent: true });
        } catch (error) {
          console.error('사용자 목록을 불러오지 못했습니다.', error);
          setAdminMsg('사용자 목록을 불러오지 못했습니다.', 'error');
        }
      }

      function populateAdminUserSelect(){
        const selects = [els.adminUserSelect, els.adminUserSelect2, els.adminUserSelect3, els.adminCouponUserSelect].filter(Boolean);
        const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];

        selects.forEach(function(select) {
          if (!select) return;
          const prev = select.value;
          const wasAllSelection = prev === ALL_USERS_OPTION;
          const hasPrevUser = users.some(function(u){ return u.uid === prev; });

          select.innerHTML='';
          const placeholder = document.createElement('option');
          placeholder.value='';
          placeholder.textContent = users.length ? '사용자를 선택하세요' : '사용자 없음';
          select.appendChild(placeholder);

          const allOption = document.createElement('option');
          allOption.value = ALL_USERS_OPTION;
          allOption.textContent = '전체 사용자 (우편 발송)';
          select.appendChild(allOption);

          users.forEach(function(user){
            const opt = document.createElement('option');
            opt.value = user.uid;
            opt.textContent = `${user.username}${user.role==='admin'?' (관리자)':''}`;
            select.appendChild(opt);
          });

          if(wasAllSelection){
            select.value = ALL_USERS_OPTION;
          } else if(hasPrevUser){
            select.value = prev;
          }
        });

        updateAdminUserStats();
      }

      function updateAdminUserStats(){
        const selectStatsPairs = [
          {select: els.adminUserSelect, stats: els.adminUserStats},
          {select: els.adminUserSelect2, stats: els.adminUserStats2},
          {select: els.adminUserSelect3, stats: els.adminUserStats3},
          {select: els.adminCouponUserSelect, stats: els.adminCouponUserStats}
        ];

        selectStatsPairs.forEach(function(pair) {
          const select = pair.select;
          const statsEl = pair.stats;
          if(!select || !statsEl) return;
          const uid = select.value;
          if(!uid){ statsEl.textContent = ''; return; }
          if(uid === ALL_USERS_OPTION){
            const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];
            if(!users.length){ statsEl.textContent = '지급 대상 사용자가 없습니다.'; return; }
            const eligible = users.filter(function(user){ return user && user.role !== 'admin'; }).length;
            const adminCount = users.length - eligible;
            let line = `전체 지급 대상: 일반 ${formatNum(eligible)}명`;
            if(adminCount > 0){ line += `, 관리자 ${formatNum(adminCount)}명`; }
            line += '. 골드/포인트/펫 뽑기권은 일반 유저에게만 지급됩니다.';
            statsEl.textContent = line;
            return;
          }
          const info = state.adminUsers.find(function(u){ return u.uid === uid; });
          if(!info){ statsEl.textContent = ''; return; }
          const walletText = info.wallet === null ? '∞' : formatNum(info.wallet||0);
          const goldText = info.gold === null ? '∞' : formatNum(info.gold||0);
          const petTicketText = info.role === 'admin' ? '∞' : formatNum(info.petTickets || 0);
          statsEl.textContent = `포인트 ${walletText} / 골드 ${goldText} / 다이아 ${formatNum(info.diamonds||0)} / 펫 뽑기권 ${petTicketText}`;
        });
      }

      function setBackupMsg(text, tone){
        if(!els.adminBackupStatus) return;
        els.adminBackupStatus.textContent = text || '';
        els.adminBackupStatus.classList.remove('msg-ok','msg-warn','msg-danger');
        if(!tone) return;
        if(tone === 'ok') els.adminBackupStatus.classList.add('msg-ok');
        else if(tone === 'warn') els.adminBackupStatus.classList.add('msg-warn');
        else if(tone === 'error') els.adminBackupStatus.classList.add('msg-danger');
      }

      function resetSnapshotSelect(label){
        if(!els.adminSnapshotSelect) return;
        els.adminSnapshotSelect.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = label;
        els.adminSnapshotSelect.appendChild(opt);
      }

      function clearBackupUi(){
        resetSnapshotSelect('스냅샷 없음');
        if(els.adminSnapshotTableBody) els.adminSnapshotTableBody.innerHTML = '';
      }

      function renderAdminSnapshotList(){
        const snapshots = Array.isArray(state.backups.snapshots) ? state.backups.snapshots : [];
        if(!els.adminSnapshotTableBody) return;
        resetSnapshotSelect(snapshots.length ? '스냅샷 선택' : '스냅샷 없음');
        if(snapshots.length && els.adminSnapshotSelect){
          snapshots.forEach(function(entry){
            const opt = document.createElement('option');
            opt.value = entry.key;
            opt.textContent = entry.label;
            els.adminSnapshotSelect.appendChild(opt);
          });
        }
        els.adminSnapshotTableBody.innerHTML = '';
        if(!snapshots.length) return;
        const frag = document.createDocumentFragment();
        snapshots.forEach(function(entry){
          const tr = document.createElement('tr');
          const keyTd = document.createElement('td');
          keyTd.textContent = entry.key;
          const timeTd = document.createElement('td');
          timeTd.textContent = entry.snapshotAt ? formatDateTime(entry.snapshotAt) : '-';
          const noteTd = document.createElement('td');
          const extras = [];
          if(typeof entry.equipCount === 'number'){ extras.push(`장비 ${formatNum(entry.equipCount)}개`); }
          if(typeof entry.spareCount === 'number'){ extras.push(`예비 ${formatNum(entry.spareCount)}개`); }
          if(entry.walletInfinite){ extras.push('포인트 ∞'); }
          else if(typeof entry.walletValue === 'number'){ extras.push(`포인트 ${formatNum(entry.walletValue)}`); }
          if(entry.goldInfinite){ extras.push('골드 ∞'); }
          else if(typeof entry.goldValue === 'number'){ extras.push(`골드 ${formatNum(entry.goldValue)}`); }
          if(entry.diamondsInfinite){ extras.push('다이아 ∞'); }
          else if(typeof entry.diamondsValue === 'number'){ extras.push(`다이아 ${formatNum(entry.diamondsValue)}`); }
          noteTd.textContent = [entry.note || '', extras.join(' · ')].filter(Boolean).join(' / ');
          tr.appendChild(keyTd);
          tr.appendChild(timeTd);
          tr.appendChild(noteTd);
          frag.appendChild(tr);
        });
        els.adminSnapshotTableBody.appendChild(frag);
      }

      const callRestoreUserProfile = httpsCallable(functions, 'restoreUserProfile');

      async function refreshAdminBackups(options){
        if(!isAdmin()) return;
        // 백업 탭에서 활성화된 사용자 선택을 찾기
        const uid = els.adminUserSelect2?.value || els.adminUserSelect3?.value || els.adminUserSelect?.value || '';
        if(!uid){
          state.backups = { mirror: null, snapshots: [] };
          clearBackupUi();
          setBackupMsg('사용자를 선택하세요.', 'warn');
          return;
        }
        if(uid === ALL_USERS_OPTION){
          state.backups = { mirror: null, snapshots: [] };
          clearBackupUi();
          setBackupMsg('전체 사용자 선택 시 백업 기능을 사용할 수 없습니다.', 'warn');
          return;
        }
        if(!options || !options.silent){
          resetSnapshotSelect('로딩 중...');
          setBackupMsg('백업 정보를 불러오는 중입니다...', null);
        }
        try {
          const [mirrorSnap, snapshotsSnap] = await Promise.all([
            get(ref(db, `mirrors/${uid}`)),
            get(ref(db, `snapshots/${uid}`))
          ]);
          const mirror = mirrorSnap.exists() ? mirrorSnap.val() : null;
          const snapshotEntries = [];
          if(snapshotsSnap.exists()){
            const raw = snapshotsSnap.val() || {};
            Object.keys(raw).forEach(function(key){
              const entry = raw[key] || {};
              const snapshotAt = typeof entry.snapshotAt === 'number' ? entry.snapshotAt : 0;
              const note = typeof entry.note === 'string' ? entry.note : '';
              const labelTime = snapshotAt ? formatDateTime(snapshotAt) : '시간 정보 없음';
              const equipCount = (entry.equip && typeof entry.equip === 'object')
                ? Object.values(entry.equip).filter(Boolean).length
                : 0;
              const spareCount = (entry.spares && typeof entry.spares === 'object')
                ? Object.values(entry.spares).filter(Boolean).length
                : 0;
              const walletValue = (typeof entry.wallet === 'number' && isFinite(entry.wallet)) ? entry.wallet : null;
              const walletInfinite = entry.wallet === null;
              const goldValue = (typeof entry.gold === 'number' && isFinite(entry.gold)) ? entry.gold : null;
              const goldInfinite = entry.gold === null;
              const diamondsValue = (typeof entry.diamonds === 'number' && isFinite(entry.diamonds)) ? entry.diamonds : null;
              const diamondsInfinite = entry.diamonds === null;
              snapshotEntries.push({
                key,
                snapshotAt,
                note,
                equipCount,
                spareCount,
                walletValue,
                walletInfinite,
                goldValue,
                goldInfinite,
                diamondsValue,
                diamondsInfinite,
                label: `${key} · ${labelTime}`
              });
            });
          }
          snapshotEntries.sort(function(a,b){ return (b.snapshotAt||0) - (a.snapshotAt||0); });
          state.backups.mirror = mirror;
          state.backups.snapshots = snapshotEntries;
          renderAdminSnapshotList();
          if(mirror && mirror.mirroredAt){
            const equipCount = (mirror.equip && typeof mirror.equip === 'object')
              ? Object.values(mirror.equip).filter(Boolean).length
              : 0;
            const spareCount = (mirror.spares && typeof mirror.spares === 'object')
              ? Object.values(mirror.spares).filter(Boolean).length
              : 0;
            const walletText = mirror.wallet === null ? '∞' : (typeof mirror.wallet === 'number' && isFinite(mirror.wallet) ? formatNum(mirror.wallet) : null);
            const goldText = mirror.gold === null ? '∞' : (typeof mirror.gold === 'number' && isFinite(mirror.gold) ? formatNum(mirror.gold) : null);
            const diamondsText = mirror.diamonds === null ? '∞' : (typeof mirror.diamonds === 'number' && isFinite(mirror.diamonds) ? formatNum(mirror.diamonds) : null);
            const resourceParts = [];
            if(walletText) resourceParts.push(`포인트 ${walletText}`);
            if(goldText) resourceParts.push(`골드 ${goldText}`);
            if(diamondsText) resourceParts.push(`다이아 ${diamondsText}`);
            const baseMsg = `미러 복제본 기준 ${formatDateTime(mirror.mirroredAt)} 저장됨 · 장비 ${formatNum(equipCount)}개 / 예비 ${formatNum(spareCount)}개`;
            setBackupMsg(resourceParts.length ? `${baseMsg} / ${resourceParts.join(' · ')}` : baseMsg, 'ok');
          } else {
            setBackupMsg('미러 데이터가 없습니다.', 'warn');
          }
        } catch (error) {
          console.error('백업 정보를 불러오지 못했습니다.', error);
          state.backups.mirror = null;
          state.backups.snapshots = [];
          clearBackupUi();
          setBackupMsg('백업 정보를 불러오지 못했습니다.', 'error');
        }
      }

      async function restoreFromMirror(){
        if(!isAdmin()) return;
        const uid = els.adminUserSelect2?.value || els.adminUserSelect3?.value || els.adminUserSelect?.value || '';
        if(!uid){ setBackupMsg('복원할 사용자를 선택하세요.', 'warn'); return; }
        if(!window.confirm('미러 백업으로 즉시 복원합니다. 계속할까요?')) return;
        setBackupMsg('미러 복원을 진행 중입니다...', null);
        try {
          await callRestoreUserProfile({ targetUid: uid, source: 'mirror' });
          setBackupMsg('미러 데이터로 복원했습니다.', 'ok');
          await refreshAdminBackups({ silent: true });
        } catch (error) {
          console.error('미러 복원 실패', error);
          const message = error?.message || '미러 복원 중 오류가 발생했습니다.';
          setBackupMsg(message, 'error');
        }
      }

      async function restoreFromSnapshot(){
        if(!isAdmin()) return;
        const uid = els.adminUserSelect2?.value || els.adminUserSelect3?.value || els.adminUserSelect?.value || '';
        if(!uid){ setBackupMsg('복원할 사용자를 선택하세요.', 'warn'); return; }
        const snapshotId = els.adminSnapshotSelect?.value || '';
        if(!snapshotId){ setBackupMsg('복원할 스냅샷을 선택하세요.', 'warn'); return; }
        if(!window.confirm(`스냅샷 '${snapshotId}'로 복원합니다. 계속할까요?`)) return;
        setBackupMsg('스냅샷 복원을 진행 중입니다...', null);
        try {
          await callRestoreUserProfile({ targetUid: uid, source: 'snapshot', snapshotId });
          setBackupMsg('스냅샷 복원이 완료되었습니다.', 'ok');
          await refreshAdminBackups({ silent: true });
        } catch (error) {
          console.error('스냅샷 복원 실패', error);
          const message = error?.message || '스냅샷 복원 중 오류가 발생했습니다.';
          setBackupMsg(message, 'error');
        }
      }

      async function handleAdminGrantResources(){ if(!isAdmin()) return; const uid = els.adminUserSelect?.value || ''; if(!uid){ setAdminMsg('지급할 대상을 선택하세요.', 'warn'); return; } const points = parseInt(els.adminGrantPoints?.value||'0', 10) || 0; const gold = parseInt(els.adminGrantGold?.value||'0', 10) || 0; const diamonds = parseInt(els.adminGrantDiamonds?.value||'0', 10) || 0; const petTickets = parseInt(els.adminGrantPetTickets?.value||'0', 10) || 0; if(points===0 && gold===0 && diamonds===0 && petTickets===0){ setAdminMsg('지급할 수치를 입력하세요.', 'warn'); return; }
        const deltas = { points, gold, diamonds, petTickets };
        const targetAll = uid === ALL_USERS_OPTION;
        try {
          if(targetAll){
            if(!Array.isArray(state.adminUsers) || !state.adminUsers.length){ await loadAdminUsers(); }
            const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];
            const eligibleCount = users.filter(function(user){ return user && user.role !== 'admin'; }).length;
            if(eligibleCount === 0){ setAdminMsg('지급 대상 일반 사용자가 없습니다.', 'warn'); return; }
            if(!window.confirm(`일반 사용자 ${formatNum(eligibleCount)}명에게 보상을 지급합니다. 계속할까요?`)) return;
            const delivered = await grantResourcesToAllUsers(deltas);
            if(delivered <= 0){ setAdminMsg('지급 가능한 사용자가 없습니다.', 'warn'); return; }
            resetAdminGrantInputs();
            await loadAdminUsers();
            if(els.adminUserSelect){ els.adminUserSelect.value = ALL_USERS_OPTION; }
            updateAdminUserStats();
            refreshAdminBackups({ silent: true });
            setAdminMsg(`전체 ${formatNum(delivered)}명에게 지급 우편을 발송했습니다. 우편함에서 수령하세요.`, 'ok');
          } else {
            const updated = await grantResourcesToUser(uid, deltas);
            if(!updated){ setAdminMsg('지급할 수치를 적용할 수 없습니다.', 'warn'); return; }
            resetAdminGrantInputs();
            await loadAdminUsers();
            if(els.adminUserSelect){ els.adminUserSelect.value = uid; }
            updateAdminUserStats();
            refreshAdminBackups({ silent: true });
            setAdminMsg('지급 우편을 발송했습니다. 우편함에서 수령하세요.', 'ok');
          }
        } catch (error) {
          console.error('지급 처리 실패', error);
          setAdminMsg('지급 처리에 실패했습니다.', 'error');
        }
      }

      async function grantResourcesToAllUsers(deltas){
        if(!isAdmin()) return 0;
        if(!Array.isArray(state.adminUsers) || !state.adminUsers.length){
          await loadAdminUsers();
        }
        const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];
        const targets = users.filter(function(user){ return user && user.uid && user.role !== 'admin'; });
        if(!targets.length) return 0;
        let success = 0;
        for(const user of targets){
          try {
            const updated = await grantResourcesToUser(user.uid, deltas);
            if(updated){ success += 1; }
          } catch (error) {
            console.error('지급 처리 실패', error);
          }
        }
        return success;
      }

      function resetAdminGrantInputs(){
        if(els.adminGrantPoints) els.adminGrantPoints.value = '0';
        if(els.adminGrantGold) els.adminGrantGold.value = '0';
        if(els.adminGrantDiamonds) els.adminGrantDiamonds.value = '0';
        if(els.adminGrantPetTickets) els.adminGrantPetTickets.value = '0';
      }

      async function grantResourcesToUser(uid, deltas){
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);
        if(!snapshot.exists()) throw new Error('사용자를 찾을 수 없습니다.');
        const data = snapshot.val() || {};
        const role = data.role === 'admin' ? 'admin' : 'user';
        const canModifyEconomy = role !== 'admin';
        const rewards = {};
        if(typeof deltas.points === 'number' && deltas.points > 0 && canModifyEconomy){ rewards.points = Math.trunc(deltas.points); }
        if(typeof deltas.gold === 'number' && deltas.gold > 0 && canModifyEconomy){ rewards.gold = Math.trunc(deltas.gold); }
        if(typeof deltas.diamonds === 'number' && deltas.diamonds > 0){ rewards.diamonds = Math.trunc(deltas.diamonds); }
        if(typeof deltas.petTickets === 'number' && deltas.petTickets > 0 && canModifyEconomy){ rewards.petTickets = Math.trunc(deltas.petTickets); }
        if(Object.keys(rewards).length === 0) return false;
        const parts = [];
        if(rewards.points) parts.push(`포인트 ${formatNum(rewards.points)}`);
        if(rewards.gold) parts.push(`골드 ${formatNum(rewards.gold)}`);
        if(rewards.diamonds) parts.push(`다이아 ${formatNum(rewards.diamonds)}`);
        if(rewards.petTickets) parts.push(`펫 뽑기권 ${formatNum(rewards.petTickets)}`);
        const message = `관리자가 다음 보상을 지급했습니다.
${parts.join(', ')}`;
        try {
          await enqueueMail(uid, {
            title: '관리자 지급 보상',
            message: message || '관리자 보상',
            rewards: rewards || {},
            type: 'admin_grant',
            metadata: {
              grantedBy: currentFirebaseUser?.uid || 'system',
              grantedAt: Date.now(),
              source: 'admin_panel',
              recipientUid: uid
            }
          });
        } catch (mailError) {
          console.error('📧 우편 발송 실패:', mailError);
          throw new Error(`우편 발송에 실패했습니다: ${mailError.message}`);
        }
        return true;
      }

      // 쿠폰 지급 관련 함수들
      function setAdminCouponMsg(message, tone = '') {
        if (!els.adminCouponMsg) return;
        els.adminCouponMsg.textContent = message || '';
        els.adminCouponMsg.classList.remove('ok', 'warn', 'error');
        if (tone) els.adminCouponMsg.classList.add(tone);
      }

      function getCouponDisplayName(type, targetKey) {
        if (type === 'gear') {
          const def = GEAR_COUPON_DEFS.find(d => d.key === targetKey);
          return def ? def.name : `SSS+ ${targetKey} 쿠폰`;
        } else if (type === 'character') {
          const def = CHARACTER_COUPON_DEFS.find(d => d.key === targetKey);
          return def ? def.name : `SSS+ ${CLASS_LABELS[targetKey] || targetKey} 쿠폰`;
        } else if (type === 'pet') {
          const def = PET_COUPON_DEFS.find(d => d.key === targetKey);
          return def ? def.name : `${targetKey} 쿠폰`;
        }
        return '알 수 없는 쿠폰';
      }

      async function handleAdminCouponGrant() {
        if (!isAdmin()) return;

        const uid = els.adminCouponUserSelect?.value || '';
        const couponValue = els.adminCouponType?.value || '';

        if (!uid) {
          setAdminCouponMsg('지급할 대상을 선택하세요.', 'warn');
          return;
        }

        if (!couponValue) {
          setAdminCouponMsg('지급할 쿠폰을 선택하세요.', 'warn');
          return;
        }

        const [type, targetKey] = couponValue.split(':');
        if (!type || !targetKey) {
          setAdminCouponMsg('올바르지 않은 쿠폰 형식입니다.', 'error');
          return;
        }

        const targetAll = uid === ALL_USERS_OPTION;
        const couponName = getCouponDisplayName(type, targetKey);

        try {
          if (targetAll) {
            if (!Array.isArray(state.adminUsers) || !state.adminUsers.length) {
              await loadAdminUsers();
            }
            const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];
            const eligibleCount = users.filter(user => user && user.role !== 'admin').length;

            if (eligibleCount === 0) {
              setAdminCouponMsg('지급 대상 일반 사용자가 없습니다.', 'warn');
              return;
            }

            if (!window.confirm(`일반 사용자 ${formatNum(eligibleCount)}명에게 ${couponName}을(를) 지급합니다. 계속할까요?`)) {
              return;
            }

            const delivered = await grantCouponToAllUsers(type, targetKey);
            if (delivered <= 0) {
              setAdminCouponMsg('지급 가능한 사용자가 없습니다.', 'warn');
              return;
            }

            await loadAdminUsers();
            if (els.adminCouponUserSelect) els.adminCouponUserSelect.value = ALL_USERS_OPTION;
            setAdminCouponMsg(`전체 ${formatNum(delivered)}명에게 ${couponName} 지급 완료`, 'ok');
          } else {
            const success = await grantCouponToUser(uid, type, targetKey);
            if (!success) {
              setAdminCouponMsg('쿠폰 지급에 실패했습니다.', 'error');
              return;
            }

            await loadAdminUsers();
            if (els.adminCouponUserSelect) els.adminCouponUserSelect.value = uid;
            setAdminCouponMsg(`${couponName} 지급 완료`, 'ok');
          }

          // 폼 초기화
          if (els.adminCouponType) els.adminCouponType.value = '';
        } catch (error) {
          console.error('쿠폰 지급 처리 실패', error);
          setAdminCouponMsg('쿠폰 지급 처리에 실패했습니다.', 'error');
        }
      }

      async function grantCouponToAllUsers(type, targetKey) {
        if (!isAdmin()) return 0;

        if (!Array.isArray(state.adminUsers) || !state.adminUsers.length) {
          await loadAdminUsers();
        }

        const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];
        const targets = users.filter(user => user && user.uid && user.role !== 'admin');

        if (!targets.length) return 0;

        let success = 0;
        for (const user of targets) {
          try {
            const granted = await grantCouponToUser(user.uid, type, targetKey);
            if (granted) success += 1;
          } catch (error) {
            console.error('쿠폰 지급 처리 실패', error);
          }
        }

        return success;
      }

      async function grantCouponToUser(uid, type, targetKey) {
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
          throw new Error('사용자를 찾을 수 없습니다.');
        }

        const data = snapshot.val() || {};
        const role = data.role === 'admin' ? 'admin' : 'user';

        if (role === 'admin') {
          console.log('관리자에게는 아이템을 지급하지 않습니다.');
          return false;
        }

        // 직접 아이템 생성 및 지급
        const itemName = getCouponDisplayName(type, targetKey);
        let message = '';
        let customRewards = {};

        try {
          if (type === 'gear') {
            // 장비 직접 생성 및 지급
            const gearItem = await createDirectGear(targetKey, 'SSS+');
            message = `관리자가 ${itemName}을(를) 지급했습니다.\n\n${gearItem.name}이(가) 우편함으로 발송되었습니다!`;
            customRewards = { directGear: gearItem };
          } else if (type === 'character') {
            // 캐릭터 직접 지급
            const characterResult = await createDirectCharacter(targetKey, 'SSS+');
            message = `관리자가 ${itemName}을(를) 지급했습니다.\n\n${characterResult.name}이(가) 우편함으로 발송되었습니다!`;
            customRewards = { directCharacter: characterResult };
          } else if (type === 'pet') {
            // 펫 직접 지급
            const petResult = await createDirectPet(targetKey);
            message = `관리자가 ${itemName}을(를) 지급했습니다.\n\n${petResult.name}이(가) 우편함으로 발송되었습니다!`;
            customRewards = { directPet: petResult };
          }

          await enqueueMail(uid, {
            title: `🎁 ${itemName} 지급`,
            message,
            type: 'direct_item_grant',
            rewards: customRewards,
            metadata: {
              grantedBy: currentFirebaseUser?.uid || 'system',
              grantedAt: Date.now(),
              source: 'admin_panel',
              recipientUid: uid
            }
          });

          return true;
        } catch (mailError) {
          console.error('📧 쿠폰 우편 발송 실패:', mailError);
          throw new Error(`쿠폰 우편 발송에 실패했습니다: ${mailError.message}`);
        }
      }

      function updateAdminCouponUserStats() {
        updateAdminUserStats(); // 기존 함수를 재사용하여 모든 select들을 업데이트
      }

      // 직접 아이템 생성 함수들
      async function createDirectGear(partKey, tier) {
        const rng = getRng();
        const partDef = PART_DEFS.find(p => p.key === partKey);

        if (!partDef) {
          throw new Error(`존재하지 않는 장비 부위: ${partKey}`);
        }

        const stat = rollStatFor(tier, partKey, rng);
        const gearItem = {
          id: state.itemSeq++,
          tier,
          part: partKey,
          base: stat,
          lvl: 0,
          type: partDef.type,
          __adminGranted: true
        };

        return {
          item: gearItem,
          name: `${tier} ${partDef.name}`,
          partKey: partKey
        };
      }

      async function createDirectCharacter(classKey, tier) {
        const characterIds = CHARACTER_IDS_BY_TIER[tier] || [];
        const classCharacters = characterIds.filter(id => {
          const def = getCharacterDefinition(id);
          return def && def.class === classKey;
        });

        if (!classCharacters.length) {
          throw new Error(`해당 클래스의 ${tier} 캐릭터를 찾을 수 없음: ${classKey}`);
        }

        const characterId = classCharacters[0];
        const def = getCharacterDefinition(characterId);

        return {
          characterId,
          definition: def,
          name: `${tier} ${def.name}`,
          class: classKey
        };
      }

      async function createDirectPet(petId) {
        const def = getPetDefinition(petId);

        if (!def) {
          throw new Error(`존재하지 않는 펫: ${petId}`);
        }

        return {
          petId,
          definition: def,
          name: def.name
        };
      }

      // 100% 확률 뽑기 시스템 (기존 쿠폰 시스템 - 사용 안함)
      async function processCouponRedemption(coupon) {
        console.log('🎟️ [processCouponRedemption] 시작:', coupon);

        if (!coupon || !coupon.type || !coupon.targetKey) {
          console.error('❌ [processCouponRedemption] 잘못된 쿠폰 데이터:', coupon);
          return null;
        }

        const { type, targetKey, tier = 'SSS+' } = coupon;
        console.log('🎟️ [processCouponRedemption] 처리할 쿠폰:', { type, targetKey, tier });

        try {
          let result = null;
          if (type === 'gear') {
            console.log('⚔️ [processCouponRedemption] 장비 쿠폰 처리 시작...');
            result = await generateGuaranteedGear(targetKey, tier);
          } else if (type === 'character') {
            console.log('👤 [processCouponRedemption] 캐릭터 쿠폰 처리 시작...');
            result = await generateGuaranteedCharacter(targetKey, tier);
          } else if (type === 'pet') {
            console.log('🐾 [processCouponRedemption] 펫 쿠폰 처리 시작...');
            result = await generateGuaranteedPet(targetKey);
          } else {
            console.error('❌ [processCouponRedemption] 알 수 없는 쿠폰 타입:', type);
            return null;
          }

          console.log('✅ [processCouponRedemption] 처리 완료:', result);
          return result;
        } catch (error) {
          console.error('❌ [processCouponRedemption] 쿠폰 처리 중 오류:', error);
          console.error('오류 스택:', error.stack);
          return null;
        }
      }

      async function generateGuaranteedGear(partKey, tier) {
        const rng = getRng();
        const partDef = PART_DEFS.find(p => p.key === partKey);

        if (!partDef) {
          console.error('존재하지 않는 장비 부위:', partKey);
          return null;
        }

        const stat = rollStatFor(tier, partKey, rng);
        const item = {
          id: state.itemSeq++,
          tier,
          part: partKey,
          base: stat,
          lvl: 0,
          type: partDef.type,
          __couponGenerated: true
        };

        // 인벤토리에 추가
        applyEquipAndInventory(item);

        // 프로필 저장 및 UI 업데이트
        await saveProfile();
        updateInventoryView();

        console.log('🎟️ 쿠폰으로 생성된 장비:', item);
        return {
          type: 'gear',
          item,
          message: `${tier} ${partDef.name}을(를) 획득했습니다!`
        };
      }

      async function generateGuaranteedCharacter(classKey, tier) {
        // 캐릭터 시스템에서 해당 클래스의 해당 등급 캐릭터 생성
        const characterIds = CHARACTER_IDS_BY_TIER[tier] || [];
        const classCharacters = characterIds.filter(id => {
          const def = getCharacterDefinition(id);
          return def && def.class === classKey;
        });

        if (!classCharacters.length) {
          console.error('해당 클래스의 캐릭터를 찾을 수 없음:', classKey, tier);
          return null;
        }

        // 첫 번째 캐릭터 선택 (실제로는 랜덤하게 선택할 수도 있음)
        const characterId = classCharacters[0];
        const def = getCharacterDefinition(characterId);

        // 캐릭터 수량 증가
        if (!state.characters.owned[characterId]) {
          state.characters.owned[characterId] = 0;
        }
        state.characters.owned[characterId] += 1;

        // 첫 번째 획득한 캐릭터라면 대표 캐릭터로 설정
        if (state.characters.owned[characterId] === 1 && !state.characters.active) {
          state.characters.active = characterId;
        }

        await saveProfile();
        updateInventoryView();

        console.log('🎟️ 쿠폰으로 생성된 캐릭터:', characterId, def);
        return {
          type: 'character',
          characterId,
          definition: def,
          message: `${tier} ${def.name} 캐릭터를 획득했습니다!`
        };
      }

      async function generateGuaranteedPet(petId) {
        const def = getPetDefinition(petId);

        if (!def) {
          console.error('존재하지 않는 펫:', petId);
          return null;
        }

        // 펫 수량 증가
        if (!state.pets.owned[petId]) {
          state.pets.owned[petId] = 0;
        }
        state.pets.owned[petId] += 1;

        // 첫 번째 획득한 펫이라면 활성 펫으로 설정
        if (state.pets.owned[petId] === 1 && !state.pets.active) {
          state.pets.active = petId;
        }

        await saveProfile();
        updateInventoryView();

        console.log('🎟️ 쿠폰으로 생성된 펫:', petId, def);
        return {
          type: 'pet',
          petId,
          definition: def,
          message: `${def.name} 펫을 획득했습니다!`
        };
      }

      function ensureAdminRareState(force){
        if(!state.admin){
          state.admin = {
            rareInitialized: false,
            rareKind: 'gear',
            rareEdits: { gear: [], character: [] },
            rareDirty: { gear: false, character: false }
          };
        }
        if(force || !state.admin.rareInitialized){
          state.admin.rareEdits = {
            gear: cloneRareAnimationListSource(state.config?.rareAnimations?.gear),
            character: cloneRareAnimationListSource(state.config?.rareAnimations?.character)
          };
          state.admin.rareDirty = { gear: false, character: false };
          state.admin.rareInitialized = true;
          state.admin.rareKind = state.admin.rareKind === 'character' ? 'character' : 'gear';
        }
      }

      function currentRareKind(){ return state.admin?.rareKind === 'character' ? 'character' : 'gear'; }

      function updateRareAnimStatus(){
        ensureAdminRareState(false);
        const kind = currentRareKind();
        const dirtyCurrent = !!state.admin?.rareDirty?.[kind];
        const dirtyAny = !!(state.admin?.rareDirty?.gear || state.admin?.rareDirty?.character);
        if(els.rareAnimStatus){
          let message = '변경 사항이 없습니다.';
          if(dirtyCurrent){
            message = '현재 탭에 저장되지 않은 변경 사항이 있습니다.';
          } else if(dirtyAny){
            message = '다른 탭에 저장되지 않은 변경 사항이 있습니다.';
          }
          els.rareAnimStatus.textContent = message;
          els.rareAnimStatus.classList.toggle('dirty', dirtyAny);
        }
        if(els.rareAnimSave) els.rareAnimSave.disabled = !dirtyAny;
        if(els.rareAnimRevert) els.rareAnimRevert.disabled = !dirtyAny;
      }

      function markAllRareDirty(value){
        ensureAdminRareState(false);
        state.admin.rareDirty.gear = value;
        state.admin.rareDirty.character = value;
        updateRareAnimStatus();
      }

      function refreshRareAnimationEditor(options){
        if(!els.rareAnimTableBody) return;
        const force = !!(options && options.force);
        ensureAdminRareState(false);
        ['gear','character'].forEach((kind)=>{
          if(force || !state.admin.rareDirty[kind]){
            state.admin.rareEdits[kind] = cloneRareAnimationListSource(state.config?.rareAnimations?.[kind]);
            state.admin.rareDirty[kind] = false;
          }
        });
        renderRareAnimTable(force);
        renderRareAnimPreview(null);
      }

      function setRareAnimMessage(text, tone){
        if(!els.rareAnimMsg) return;
        els.rareAnimMsg.textContent = text || '';
        els.rareAnimMsg.classList.remove('ok','warn','danger');
        if(tone === 'ok') els.rareAnimMsg.classList.add('ok');
        else if(tone === 'warn') els.rareAnimMsg.classList.add('warn');
        else if(tone === 'error' || tone === 'danger') els.rareAnimMsg.classList.add('danger');
      }

      function markRareAnimDirty(kind, dirty){
        ensureAdminRareState(false);
        state.admin.rareDirty[kind] = dirty;
        updateRareAnimStatus();
      }

      function renderRareAnimPreview(content){
        if(!els.rareAnimPreview) return;
        els.rareAnimPreview.innerHTML = '';
        if(!content){
          const span = document.createElement('div');
          span.className = 'muted small';
          span.textContent = '미리보기 버튼을 눌러 확인하세요.';
          els.rareAnimPreview.appendChild(span);
          return;
        }
        els.rareAnimPreview.appendChild(content);
      }

      function renderRareAnimTable(force){
        if(!els.rareAnimTableBody) return;
        ensureAdminRareState(force);
        const kind = currentRareKind();
        const list = state.admin.rareEdits?.[kind] || [];
        const tbody = els.rareAnimTableBody;
        tbody.innerHTML = '';
        if(els.rareAnimKind){
          els.rareAnimKind.value = kind;
        }
        list.forEach((entry, index)=>{
          const row = document.createElement('tr');
          row.dataset.index = String(index);
          const tierCell = document.createElement('td');
          const tierSelect = document.createElement('select');
          tierSelect.dataset.field = 'tier';
          TIERS.forEach((tier)=>{
            const opt = document.createElement('option');
            opt.value = tier;
            opt.textContent = tier;
            if(entry.tier === tier) opt.selected = true;
            tierSelect.appendChild(opt);
          });
          tierCell.appendChild(tierSelect);
          const idCell = document.createElement('td');
          const idInput = document.createElement('input');
          idInput.type = 'text';
          idInput.dataset.field = 'id';
          idInput.placeholder = '선택';
          idInput.value = entry.id || '';
          idCell.appendChild(idInput);
          const labelCell = document.createElement('td');
          const labelInput = document.createElement('input');
          labelInput.type = 'text';
          labelInput.dataset.field = 'label';
          labelInput.placeholder = `${entry.tier || 'SS+'} 획득!`;
          labelInput.value = entry.label || '';
          labelCell.appendChild(labelInput);
          const srcCell = document.createElement('td');
          const srcInput = document.createElement('input');
          srcInput.type = 'url';
          srcInput.dataset.field = 'src';
          srcInput.placeholder = 'https://example.com/anim.gif';
          srcInput.value = entry.src || '';
          srcCell.appendChild(srcInput);
          const durCell = document.createElement('td');
          const durInput = document.createElement('input');
          durInput.type = 'number';
          durInput.dataset.field = 'duration';
          durInput.min = '600';
          durInput.max = '20000';
          durInput.value = String(entry.duration || RARE_ANIMATION_DURATION_MS);
          durCell.appendChild(durInput);
          const previewCell = document.createElement('td');
          const previewBtn = document.createElement('button');
          previewBtn.type = 'button';
          previewBtn.className = 'rare-preview';
          previewBtn.textContent = '미리보기';
          previewCell.appendChild(previewBtn);
          const removeCell = document.createElement('td');
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'rare-remove';
          removeBtn.textContent = '삭제';
          removeCell.appendChild(removeBtn);
          row.append(tierCell, idCell, labelCell, srcCell, durCell, previewCell, removeCell);
          tbody.appendChild(row);
        });
        updateRareAnimStatus();
      }

      function sanitizeRareEntry(entry){
        const tier = TIERS.includes(entry?.tier) ? entry.tier : 'SS+';
        const src = typeof entry?.src === 'string' ? entry.src.trim() : '';
        if(!src) return null;
        const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
        const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
        const duration = clampNumber(Number(entry?.duration), 600, 20000, RARE_ANIMATION_DURATION_MS);
        const clean = { tier, src, duration };
        if(label) clean.label = label;
        if(id) clean.id = id;
        return clean;
      }

      function collectRareAnimationPayload(){
        ensureAdminRareState(false);
        const result = { gear: [], character: [] };
        ['gear','character'].forEach((kind)=>{
          const list = state.admin.rareEdits?.[kind] || [];
          list.forEach((entry)=>{
            const clean = sanitizeRareEntry(entry);
            if(clean){ result[kind].push(clean); }
          });
          result[kind].sort((a,b)=>{
            const ai = TIER_INDEX[a.tier] ?? Number.POSITIVE_INFINITY;
            const bi = TIER_INDEX[b.tier] ?? Number.POSITIVE_INFINITY;
            if(ai !== bi) return ai - bi;
            const aid = a.id || '';
            const bid = b.id || '';
            return aid.localeCompare(bid, 'ko-KR', { sensitivity:'base' });
          });
        });
        return result;
      }

      function resetRareAnimations(kind){
        const target = kind || currentRareKind();
        ensureAdminRareState(false);
        state.admin.rareEdits[target] = cloneRareAnimationListSource(state.config?.rareAnimations?.[target]);
        markRareAnimDirty(target, false);
        renderRareAnimTable(true);
        renderRareAnimPreview(null);
        setRareAnimMessage('현재 설정을 다시 불러왔습니다.', 'warn');
      }

      function reloadRareAnimationsFromConfig(){
        ensureAdminRareState(true);
        renderRareAnimTable(true);
        renderRareAnimPreview(null);
        setRareAnimMessage('서버의 최신 상태로 되돌렸습니다.', 'warn');
      }

      function handleRareAnimInput(event){
        if(!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) return;
        const field = event.target.dataset.field;
        if(!field) return;
        const row = event.target.closest('tr');
        if(!row) return;
        const index = parseInt(row.dataset.index || '-1', 10);
        if(!(index >= 0)) return;
        const kind = currentRareKind();
        const list = state.admin?.rareEdits?.[kind];
        if(!list || !list[index]) return;
        if(field === 'duration'){
          const value = parseInt(event.target.value || '0', 10);
          list[index][field] = clampNumber(value, 600, 20000, RARE_ANIMATION_DURATION_MS);
          event.target.value = String(list[index][field]);
        } else if(field === 'tier'){
          const value = event.target.value;
          if(TIERS.includes(value)){
            list[index][field] = value;
          }
        } else {
          list[index][field] = event.target.value || '';
        }
        markRareAnimDirty(kind, true);
      }

      function handleRareAnimClick(event){
        const button = event.target instanceof HTMLButtonElement ? event.target : null;
        if(!button) return;
        const row = button.closest('tr');
        if(!row) return;
        const index = parseInt(row.dataset.index || '-1', 10);
        if(!(index >= 0)) return;
        const kind = currentRareKind();
        const list = state.admin?.rareEdits?.[kind];
        if(!list || !list[index]) return;
        if(button.classList.contains('rare-remove')){
          list.splice(index, 1);
          markRareAnimDirty(kind, true);
          renderRareAnimTable(true);
          return;
        }
        if(button.classList.contains('rare-preview')){
          const clean = sanitizeRareEntry({ ...list[index] });
          if(!clean){
            const span = document.createElement('div');
            span.className = 'muted small';
            span.textContent = '유효한 이미지 URL을 입력하세요.';
            renderRareAnimPreview(span);
            return;
          }
          const wrapper = document.createElement('div');
          wrapper.className = 'rare-preview-card';
          const title = document.createElement('div');
          title.className = 'muted small';
          title.textContent = `${clean.tier}${clean.id ? ` · ${clean.id}` : ''}`;
          wrapper.appendChild(title);
          if(clean.label){
            const label = document.createElement('div');
            label.className = 'muted small';
            label.textContent = clean.label;
            wrapper.appendChild(label);
          }
          const img = document.createElement('img');
          img.src = clean.src;
          img.alt = clean.label || `${clean.tier} 연출`;
          img.style.maxWidth = '100%';
          img.style.display = 'block';
          img.style.borderRadius = '8px';
          img.onerror = ()=>{
            const warn = document.createElement('div');
            warn.className = 'muted small';
            warn.textContent = '이미지를 불러오지 못했습니다.';
            renderRareAnimPreview(warn);
          };
          wrapper.appendChild(img);
          renderRareAnimPreview(wrapper);
        }
      }

      function addRareAnimationRow(){
        const kind = currentRareKind();
        ensureAdminRareState(false);
        const list = state.admin.rareEdits[kind];
        list.push({ tier: 'SS+', id: '', src: '', label: '', duration: RARE_ANIMATION_DURATION_MS });
        markRareAnimDirty(kind, true);
        renderRareAnimTable(true);
      }

      async function saveRareAnimations(){
        if(!isAdmin()) return;
        const payload = collectRareAnimationPayload();
        setRareAnimMessage('저장 중...', 'warn');
        try {
          await update(ref(db, GLOBAL_CONFIG_PATH), { rareAnimations: payload, updatedAt: Date.now() });
          state.config.rareAnimations = { gear: clonePlain(payload.gear), character: clonePlain(payload.character) };
          if(state.baseConfig){
            state.baseConfig.rareAnimations = clonePlain(state.config.rareAnimations);
          }
          ensureAdminRareState(true);
          markAllRareDirty(false);
          renderRareAnimTable(true);
          setRareAnimMessage('희귀 연출이 저장되었습니다.', 'ok');
        } catch (error) {
          console.error('희귀 연출 저장 실패', error);
          setRareAnimMessage('저장에 실패했습니다. 다시 시도하세요.', 'error');
        }
      }

      function detachProfileListener(){ if(state.profileListener){ try { state.profileListener(); } catch (err) { console.warn('프로필 리스너 해제 실패', err); } state.profileListener = null; } }

      function detachGlobalConfigListener(){
        if(state.globalConfigListener){
          try {
            state.globalConfigListener();
          } catch (err) {
            console.warn('전역 설정 리스너 해제 실패', err);
          }
          state.globalConfigListener = null;
        }
      }

      function sameEquipMap(a, b){
        return JSON.stringify(a) === JSON.stringify(b);
      }

      function attachProfileListener(uid){ if(!uid) return; detachProfileListener(); const userRef = ref(db, `users/${uid}`); state.profileListener = onValue(userRef, (snapshot)=>{
          if(!snapshot.exists()) return;
          if(!state.user || state.user.uid !== uid) return;
          const data = snapshot.val() || {};
          const role = data.role === 'admin' ? 'admin' : 'user';
          if(state.user.role !== role){ state.user.role = role; }
          const nextEquip = sanitizeEquipMap(data.equip);
          const nextSpares = sanitizeEquipMap(data.spares);
          if(!sameEquipMap(nextEquip, state.equip) || !sameEquipMap(nextSpares, state.spares)){
            state.equip = nextEquip;
            state.spares = nextSpares;
            if(userProfile){
              userProfile.equip = nextEquip;
              userProfile.spares = nextSpares;
            }
            refreshInventoryCache();
            updateInventoryView();
            buildForgeTargetOptions();
            updateForgeInfo();
          }
          const incomingSettings = sanitizeUserSettings(data.settings);
          const currentEffects = state.settings?.effects || {};
          const nextEffects = incomingSettings.effects || {};
          if(currentEffects.characterUltimateGif !== nextEffects.characterUltimateGif || currentEffects.petUltimateGif !== nextEffects.petUltimateGif){
            state.settings = incomingSettings;
            if(userProfile){ userProfile.settings = incomingSettings; }
            if(isUserOptionsOpen()){ syncUserOptionsInputs(); }
          }
          const incomingCharacterStats = sanitizeCharacterDrawStats(data.characterStats);
          const prevCharacterStats = sanitizeCharacterDrawStats(state.characterStats);
          let statsChanged = incomingCharacterStats.draws !== prevCharacterStats.draws;
          if(!statsChanged){
            statsChanged = TIERS.some((tier)=> incomingCharacterStats.counts[tier] !== prevCharacterStats.counts[tier]);
          }
          const isOlderSnapshot =
            incomingCharacterStats.draws < prevCharacterStats.draws ||
            TIERS.some((tier) => incomingCharacterStats.counts[tier] < prevCharacterStats.counts[tier]);
          if(statsChanged && !isOlderSnapshot){
            state.characterStats = incomingCharacterStats;
            if(userProfile){ userProfile.characterStats = incomingCharacterStats; }
            if(state.ui.statsMode === 'character'){
              renderCharacterStats();
            }
          }
          const items = sanitizeItems(data.items);
          const prevItems = state.items || {};
          let itemsChanged = false;
          Object.keys(items).forEach(function(key){ const next = items[key]; if((prevItems[key] || 0) !== next){ itemsChanged = true; } });
          if(itemsChanged){ state.items = { ...prevItems, ...items }; if(userProfile){ if(!userProfile.items || typeof userProfile.items !== 'object'){ userProfile.items = {}; } Object.assign(userProfile.items, items); }
            if(state.profile){ if(!state.profile.items || typeof state.profile.items !== 'object'){ state.profile.items = {}; } Object.assign(state.profile.items, items); }
            updateItemCountsView();
            updateBattleResControls();
          }

          const nextPets = sanitizePetState(data.pets);
          if(JSON.stringify(nextPets) !== JSON.stringify(state.pets)){
            state.pets = nextPets;
            if(userProfile) userProfile.pets = nextPets;
            updatePetList();
          }

          const nextCharacters = sanitizeCharacterState(data.characters);
          if(JSON.stringify(nextCharacters) !== JSON.stringify(state.characters)){
            state.characters = nextCharacters;
            if(userProfile) userProfile.characters = nextCharacters;
            updateCharacterList();
          }

          const nextQuests = sanitizeQuestState(data.quests);
          if(JSON.stringify(nextQuests) !== JSON.stringify(state.quests)){
            state.quests = nextQuests;
            if(userProfile) userProfile.quests = nextQuests;
            if(state.profile) state.profile.quests = nextQuests;
            refreshQuestView();
            recoverPendingQuestRewards();
          }

          if(role === 'admin'){ return; }
          if(typeof data.wallet === 'number' && isFinite(data.wallet)){
            const walletVal = clampNumber(data.wallet, 0, Number.MAX_SAFE_INTEGER, data.wallet);
            if(walletVal !== state.wallet){ state.wallet = walletVal; if(userProfile) userProfile.wallet = walletVal; if(state.profile) state.profile.wallet = walletVal; updatePointsView(); }
          }
          if(typeof data.gold === 'number' && isFinite(data.gold)){
            const goldVal = clampNumber(data.gold, 0, Number.MAX_SAFE_INTEGER, data.gold);
            if(goldVal !== state.gold){ state.gold = goldVal; if(userProfile) userProfile.gold = goldVal; if(state.profile) state.profile.gold = goldVal; updateGoldView(); }
          }
          if(typeof data.diamonds === 'number' && isFinite(data.diamonds)){
            const diamondsVal = clampNumber(data.diamonds, 0, Number.MAX_SAFE_INTEGER, data.diamonds);
            if(diamondsVal !== state.diamonds){ state.diamonds = diamondsVal; if(userProfile) userProfile.diamonds = diamondsVal; if(state.profile) state.profile.diamonds = diamondsVal; updateDiamondsView(); }
          }
        }, (error)=>{
          console.error('프로필 실시간 수신 실패', error);
        }); }

      function applyGlobalConfigUpdate(raw){
        if(!state.user) return;
        const payload = (raw && typeof raw === 'object') ? raw : {};
        const configSource = (payload.config && typeof payload.config === 'object') ? payload.config : payload;
        state.config = sanitizeConfig(configSource);
        state.baseConfig = clonePlain(state.config);
        state.enhance = sanitizeEnhanceConfig(payload.enhance);
        state.rewardPresets = sanitizeRewardPresets(payload.rewardPresets);
        applyFlags(payload.flags || state.flags || DEFAULT_FLAGS, { reflect: false, forceCompose: true });
        const activePresetId = typeof payload.activePresetId === 'string' ? payload.activePresetId : null;
        const activePresetName = typeof payload.activePresetName === 'string' ? payload.activePresetName : null;
        state.presets.activeGlobalId = activePresetId;
        state.presets.activeGlobalName = activePresetName;

        buildForgeTable();
        updateForgeInfo();
        refreshRareAnimationEditor({ force: true });
        updateFlagControls();
        reflectConfig();

        if(userProfile){
          userProfile.config = state.config;
          userProfile.petGachaWeights = state.petGachaWeights;
          if(userProfile.enhance){
            delete userProfile.enhance;
          }
        }

        updateAdminPresetSelector();
        updateUserPresetSelectors();
      }

      function attachGlobalConfigListener(){
        if(!state.user) return;
        detachGlobalConfigListener();
        const globalRef = ref(db, GLOBAL_CONFIG_PATH);
        state.globalConfigListener = onValue(globalRef, (snapshot)=>{
          if(!snapshot.exists()){
            applyGlobalConfigUpdate(null);
            return;
          }
          applyGlobalConfigUpdate(snapshot.val());
        }, (error)=>{
          console.error('전역 설정 실시간 수신 실패', error);
        });
      }

      async function fetchGlobalConfig(){ try {
          const snapshot = await get(ref(db, GLOBAL_CONFIG_PATH));
          if(snapshot.exists()){
            const raw = snapshot.val();
            if(raw && typeof raw === 'object' && raw.config){
              return {
                config: sanitizeConfig(raw.config),
                enhance: sanitizeEnhanceConfig(raw.enhance),
                rewardPresets: sanitizeRewardPresets(raw.rewardPresets),
                flags: sanitizeFlags(raw.flags),
                activePresetId: typeof raw.activePresetId === 'string' ? raw.activePresetId : null,
                activePresetName: typeof raw.activePresetName === 'string' ? raw.activePresetName : null
              };
            }
            return {
              config: sanitizeConfig(raw),
              enhance: sanitizeEnhanceConfig(raw.enhance),
              rewardPresets: sanitizeRewardPresets(raw.rewardPresets),
              flags: sanitizeFlags(raw.flags),
              activePresetId: null,
              activePresetName: null
            };
          }
        } catch (error) {
          console.error('전역 설정을 불러오지 못했습니다.', error);
        }
        return null;
      }

      async function persistGlobalConfig(config, meta){ try {
          const sanitized = sanitizeConfig(config);
          const payload = {
            config: sanitized,
            enhance: sanitizeEnhanceConfig(state.enhance),
            rewardPresets: state.rewardPresets ? clonePlain(state.rewardPresets) : {},
            flags: sanitizeFlags(state.flags),
            updatedAt: Date.now()
          };
          if(meta && typeof meta.activePresetId === 'string'){
            payload.activePresetId = meta.activePresetId;
          } else {
            payload.activePresetId = null;
          }
          if(meta && typeof meta.activePresetName === 'string'){
            payload.activePresetName = meta.activePresetName;
          } else {
            payload.activePresetName = null;
          }
          await set(ref(db, GLOBAL_CONFIG_PATH), payload);
        } catch (error) {
          console.error('전역 설정 저장에 실패했습니다.', error);
        }
      }

      function defaultEnhance(){
        const multipliers = [
          1,
          1.10,
          1.1990,
          1.2949,
          1.3856,
          1.4687,
          1.5421,
          1.6192,
          1.6840,
          1.7514,
          1.8039,
          1.8580,
          1.9138,
          1.9616,
          2.0107,
          2.0609,
          2.1021,
          2.1442,
          3.0,
          5.0,
          12.0
        ];
        const probs = [
          0,
          0.99,
          0.97,
          0.95,
          0.92,
          0.90,
          0.80,
          0.70,
          0.60,
          0.50,
          0.45,
          0.35,
          0.30,
          0.25,
          0.20,
          0.15,
          0.05,
          0.04,
          0.03,
          0.02,
          0.01
        ];
        return { multipliers, probs };
      }

      function createEmptyGearShardState(){
        return TIERS.reduce((acc, tier)=>{
          acc[tier] = 0;
          return acc;
        }, {});
      }

      function sanitizeGearShardState(raw){
        const base = createEmptyGearShardState();
        if(!raw || typeof raw !== 'object'){
          return base;
        }
        TIERS.forEach((tier)=>{
          base[tier] = clampNumber(raw[tier], 0, Number.MAX_SAFE_INTEGER, base[tier]);
        });
        return base;
      }

      // RNG
      function djb2(str){ let h=5381; for(let i=0;i<str.length;i++){ h=((h<<5)+h) + str.charCodeAt(i); h|=0; } return h>>>0; }
      function mulberry32(a){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      function cryptoRand(){ const arr = new Uint32Array(1); crypto.getRandomValues(arr); return (arr[0] + 1) / 4294967297; }
      function getRng(){ if(state.config.seed && state.config.seed.length){ return mulberry32(djb2(state.config.seed)); } return cryptoRand; }
      function cloneDropRates(src){ return JSON.parse(JSON.stringify(src||DEFAULT_DROP_RATES)); }
      function normalizeDropRates(raw){ const base = cloneDropRates(DEFAULT_DROP_RATES); if(!raw) return base; const out = cloneDropRates(base); Object.keys(base).forEach(function(k){ const item = raw[k]; if(item && typeof item==='object'){ if(typeof item.base==='number') out[k].base = item.base; if(typeof item.perLevel==='number') out[k].perLevel = item.perLevel; if(typeof item.max==='number') out[k].max = item.max; } else if(typeof item==='number'){ out[k].base = item; out[k].perLevel = 0; out[k].max = item; }
        out[k].base = isFinite(out[k].base) ? out[k].base : base[k].base;
        out[k].perLevel = isFinite(out[k].perLevel) ? out[k].perLevel : base[k].perLevel;
        out[k].max = isFinite(out[k].max) ? out[k].max : base[k].max;
        out[k].base = Math.max(0, Math.min(1, out[k].base));
        out[k].perLevel = Math.max(0, out[k].perLevel);
        out[k].max = Math.max(out[k].base, Math.min(1, out[k].max));
      });
        return out;
      }
      function normalizeShopPrices(raw){ const defaults = { ...DEFAULT_SHOP_PRICES }; const result = { ...defaults }; if(raw && typeof raw === 'object'){ Object.keys(defaults).forEach(function(key){ const value = raw[key]; if(value === undefined || value === null) return; const num = Number(value); if(Number.isFinite(num) && num >= 0){ result[key] = Math.floor(num); } }); }
        return result;
      }
      function normalizePotionSettings(raw, defaults){ const base = { ...(defaults || DEFAULT_POTION_SETTINGS) }; if(raw && typeof raw === 'object'){ const duration = Number(raw.durationMs ?? raw.duration ?? base.durationMs); const manual = Number(raw.manualCdMs ?? raw.manualCd ?? base.manualCdMs); const auto = Number(raw.autoCdMs ?? raw.autoCd ?? base.autoCdMs); const speed = Number(raw.speedMultiplier ?? raw.speed ?? base.speedMultiplier); if(Number.isFinite(duration) && duration >= 0) base.durationMs = Math.round(duration); if(Number.isFinite(manual) && manual >= 0) base.manualCdMs = Math.round(manual); if(Number.isFinite(auto) && auto >= 0) base.autoCdMs = Math.round(auto); if(Number.isFinite(speed) && speed > 0) base.speedMultiplier = speed; }
        base.durationMs = Math.max(0, base.durationMs);
        base.manualCdMs = Math.max(0, base.manualCdMs);
        base.autoCdMs = Math.max(0, base.autoCdMs);
        base.speedMultiplier = Math.max(0.1, base.speedMultiplier || (defaults?.speedMultiplier ?? 1));
        return base;
      }
      function normalizeMonsterScaling(raw){ const base = { ...DEFAULT_MONSTER_SCALING }; if(raw && typeof raw === 'object'){ const coerce = (key, min, max)=>{ const value = Number(raw[key]); if(Number.isFinite(value)){ if(min !== undefined && value < min) return min; if(max !== undefined && value > max) return max; return value; } return base[key]; }; base.basePower = coerce('basePower', 1); base.maxPower = coerce('maxPower', base.basePower); base.curve = coerce('curve', 0.1); base.difficultyMultiplier = coerce('difficultyMultiplier', 0.01); base.attackShare = coerce('attackShare', 0); base.defenseShare = coerce('defenseShare', 0); base.hpMultiplier = coerce('hpMultiplier', 0.1); base.speedBase = coerce('speedBase', 1); base.speedMax = coerce('speedMax', base.speedBase); base.critRateBase = coerce('critRateBase', 0); base.critRateMax = coerce('critRateMax', base.critRateBase); base.critDmgBase = coerce('critDmgBase', 0); base.critDmgMax = coerce('critDmgMax', base.critDmgBase); base.dodgeBase = coerce('dodgeBase', 0); base.dodgeMax = coerce('dodgeMax', base.dodgeBase); }
        if(base.maxPower < base.basePower) base.maxPower = base.basePower;
        if(base.speedMax < base.speedBase) base.speedMax = base.speedBase;
        if(base.critRateMax < base.critRateBase) base.critRateMax = base.critRateBase;
        if(base.critDmgMax < base.critDmgBase) base.critDmgMax = base.critDmgBase;
        if(base.dodgeMax < base.dodgeBase) base.dodgeMax = base.dodgeBase;
        return base;
      }
      function normalizeGoldScaling(raw){ const base = {...DEFAULT_GOLD_SCALING}; const coerce = (val)=> (typeof val==='number' && isFinite(val)) ? val : null; if(raw){ const a = coerce(raw.minLow); const b = coerce(raw.maxLow); const c = coerce(raw.minHigh); const d = coerce(raw.maxHigh); if(a!==null) base.minLow = a; if(b!==null) base.maxLow = b; if(c!==null) base.minHigh = c; if(d!==null) base.maxHigh = d; }
        if(base.maxLow < base.minLow) base.maxLow = base.minLow;
        if(base.minHigh < base.minLow) base.minHigh = base.minLow;
        if(base.maxHigh < base.minHigh) base.maxHigh = base.minHigh;
        return base;
      }
      function refreshInventoryCache(){ state.inventory = [...Object.values(state.equip).filter(Boolean), ...PART_KEYS.map(function(part){ return state.spares[part]; }).filter(Boolean)]; }
      function ensureGearShards(){ if(!state.gearShards || typeof state.gearShards !== 'object'){ state.gearShards = createEmptyGearShardState(); } return state.gearShards; }
      function availableGearShards(tier){ const shards = ensureGearShards(); return clampNumber(shards[tier], 0, Number.MAX_SAFE_INTEGER, 0); }
      function addGearShards(tier, amount){ if(!TIERS.includes(tier)) return availableGearShards(tier); const shards = ensureGearShards(); const inc = Math.max(0, Math.floor(amount||0)); if(inc <= 0) return availableGearShards(tier); shards[tier] = clampNumber((shards[tier] || 0) + inc, 0, Number.MAX_SAFE_INTEGER, shards[tier] || 0); markProfileDirty(); updateGearShardView(); return shards[tier]; }
      function spendGearShards(tier, amount){ if(!TIERS.includes(tier)) return false; const shards = ensureGearShards(); const need = Math.max(0, Math.floor(amount||0)); if(need <= 0) return true; if((shards[tier] || 0) < need) return false; shards[tier] -= need; markProfileDirty(); updateGearShardView(); return true; }
      function gearEnhancementState(item){ if(!item) return { level: 0, progress: 0, next: getEnhancementRequirement(0), multiplier: 1, isMax: false }; const level = clampEnhancementLevel(item.lvl || 0); const progress = clampEnhancementProgress(level, item.progress || 0); const next = getEnhancementRequirement(level); return { level, progress, next, multiplier: getEnhancementMultiplier(level), isMax: !next }; }
      function formatGearEnhancementLabel(item){
        const stateInfo = gearEnhancementState(item);
        if(stateInfo.isMax){ return 'MAX'; }
        const nextCost = stateInfo.next?.cost || 0;

        // Check if this level has a custom label (like MAX+1)
        const rule = getEnhancementRule(stateInfo.level);
        if(rule && rule.label) {
          return `${rule.label} (${stateInfo.progress}/${nextCost})`;
        }

        return `Lv.${stateInfo.level} (${stateInfo.progress}/${nextCost})`;
      }
      function applyGearShardsToItem(item, shards){ if(!item) return { consumed: 0, levelBefore: 0, levelAfter: 0, progressBefore: 0, progressAfter: 0, isMax: true }; let remaining = Math.max(0, Math.floor(shards||0)); if(remaining <= 0) return { consumed: 0, levelBefore: clampEnhancementLevel(item.lvl||0), levelAfter: clampEnhancementLevel(item.lvl||0), progressBefore: clampEnhancementProgress(item.lvl||0, item.progress||0), progressAfter: clampEnhancementProgress(item.lvl||0, item.progress||0), isMax: !getEnhancementRequirement(item.lvl||0) }; let level = clampEnhancementLevel(item.lvl || 0); let progress = clampEnhancementProgress(level, item.progress || 0); const levelBefore = level; const progressBefore = progress; let consumed = 0; while(remaining > 0 && level < MAX_ENHANCEMENT_LEVEL){ const req = getEnhancementRequirement(level); if(!req) break; const needed = req.cost - progress; const use = Math.min(remaining, needed); if(use <= 0) break; progress += use; remaining -= use; consumed += use; if(progress >= req.cost){ level += 1; progress = 0; } }
        item.lvl = level;
        item.progress = progress;
        return { consumed, levelBefore, levelAfter: level, progressBefore, progressAfter: progress, isMax: !getEnhancementRequirement(level) };
      }
      function spareItem(part){ return state.spares[part] || null; }
      function storeSpare(item, force){ if(!item || !item.part) return; const part = item.part; const existing = spareItem(part); if(force){ if(existing){ addGearShards(existing.tier, 1); } state.spares[part] = item; refreshInventoryCache(); markProfileDirty(); return; }
        if(!existing){ state.spares[part] = item; refreshInventoryCache(); markProfileDirty(); return; }
        const better = effectiveStat(item) > effectiveStat(existing) || (effectiveStat(item) === effectiveStat(existing) && TIER_RANK[item.tier] > TIER_RANK[existing.tier]);
        if(better){ addGearShards(existing.tier, 1); state.spares[part] = item; refreshInventoryCache(); markProfileDirty(); }
        else { addGearShards(item.tier, 1); }
      }
      function normalizedDifficultyAdjustments(){ const sanitized = sanitizeDifficultyAdjustments(state.config?.difficultyAdjustments); if(!state.config.difficultyAdjustments || state.config.difficultyAdjustments.easy !== sanitized.easy || state.config.difficultyAdjustments.hard !== sanitized.hard){ state.config.difficultyAdjustments = sanitized; } return sanitized; }
      const DIFFICULTY_PREVIEW_PRESETS = Object.freeze([
        { id: 'easy', label: '이지' },
        { id: 'normal', label: '노멀' },
        { id: 'hard', label: '하드' }
      ]);
      const formatPreviewPercent = (value)=>{
        const numeric = Number(value);
        if(!Number.isFinite(numeric)) return '∞';
        const rounded = Math.round(numeric * 10) / 10;
        const display = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
        return `${display}%`;
      };
      const formatPreviewNumber = (value)=>{
        const numeric = Number(value);
        if(!Number.isFinite(numeric)) return '∞';
        return formatNum(Math.round(numeric));
      };
      function renderMonsterPreviewTable(level = 100){
        if(!els.monsterPreviewTableBody) return;
        const scaling = normalizeMonsterScaling(state.config?.monsterScaling);
        const adjustments = normalizedDifficultyAdjustments();
        const baseMultiplier = Math.max(0.01, Number(scaling.difficultyMultiplier) || DEFAULT_MONSTER_SCALING.difficultyMultiplier);
        const lvl = Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1));
        const denominator = Math.max(1, (MAX_LEVEL - 1) || 1);
        const norm = Math.min(1, Math.max(0, (lvl - 1) / denominator));
        const basePower = Math.max(1, Number(scaling.basePower) || DEFAULT_MONSTER_SCALING.basePower);
        const maxPower = Math.max(basePower, Number(scaling.maxPower) || DEFAULT_MONSTER_SCALING.maxPower);
        const curve = Number.isFinite(scaling.curve) && scaling.curve > 0 ? scaling.curve : DEFAULT_MONSTER_SCALING.curve;
        const powerCore = (maxPower - basePower) * Math.pow(norm, curve) + basePower;
        const atkShare = Number(scaling.attackShare) || DEFAULT_MONSTER_SCALING.attackShare;
        const defShare = Number(scaling.defenseShare) || DEFAULT_MONSTER_SCALING.defenseShare;
        const hpMultiplier = Number(scaling.hpMultiplier) || DEFAULT_MONSTER_SCALING.hpMultiplier;
        const speedBase = Number(scaling.speedBase) || DEFAULT_MONSTER_SCALING.speedBase;
        const speedMax = Math.max(speedBase, Number(scaling.speedMax) || DEFAULT_MONSTER_SCALING.speedMax);
        const critRateBase = Number(scaling.critRateBase) || DEFAULT_MONSTER_SCALING.critRateBase;
        const critRateMax = Math.max(critRateBase, Number(scaling.critRateMax) || DEFAULT_MONSTER_SCALING.critRateMax);
        const critDmgBase = Number(scaling.critDmgBase) || DEFAULT_MONSTER_SCALING.critDmgBase;
        const critDmgMax = Math.max(critDmgBase, Number(scaling.critDmgMax) || DEFAULT_MONSTER_SCALING.critDmgMax);
        const dodgeBase = Number(scaling.dodgeBase) || DEFAULT_MONSTER_SCALING.dodgeBase;
        const dodgeMax = Math.max(dodgeBase, Number(scaling.dodgeMax) || DEFAULT_MONSTER_SCALING.dodgeMax);
        const speed = Math.round(speedBase + (speedMax - speedBase) * Math.pow(norm, 0.7));
        const critRate = Math.min(critRateMax, critRateBase + (critRateMax - critRateBase) * Math.pow(norm, 0.9));
        const critDmg = Math.min(critDmgMax, critDmgBase + (critDmgMax - critDmgBase) * Math.pow(norm, 1.05));
        const dodge = Math.min(dodgeMax, dodgeBase + (dodgeMax - dodgeBase) * Math.pow(norm, 0.95));
        const easyPercent = adjustments.easy;
        const hardPercent = adjustments.hard;
        const rowsHtml = DIFFICULTY_PREVIEW_PRESETS.map((preset)=>{
          const percent = preset.id === 'easy' ? easyPercent : (preset.id === 'hard' ? hardPercent : 0);
          const bonusRatio = Math.max(0.05, 1 + percent / 100);
          const difficultyMultiplier = baseMultiplier * bonusRatio;
          const power = Math.max(1, powerCore * difficultyMultiplier);
          const atk = Math.max(1, Math.round(power * atkShare));
          const def = Math.max(1, Math.round(power * defShare));
          const hp = Math.max(lvl * 150, Math.round(power * hpMultiplier));
          const multiplierLabel = `${formatMultiplier(difficultyMultiplier)}×`;
          return `<tr>
                <td>${preset.label}</td>
                <td>${multiplierLabel}</td>
                <td>${formatPreviewNumber(power)}</td>
                <td>${formatPreviewNumber(hp)}</td>
                <td>${formatPreviewNumber(atk)}</td>
                <td>${formatPreviewNumber(def)}</td>
                <td>${formatPreviewNumber(speed)}</td>
                <td>${formatPreviewPercent(critRate)}</td>
                <td>${formatPreviewPercent(critDmg)}</td>
                <td>${formatPreviewPercent(dodge)}</td>
              </tr>`;
        }).join('');
        els.monsterPreviewTableBody.innerHTML = rowsHtml;
      }
      function updateDifficultyPreview(){ const normalBase = Math.max(0.1, Number(state.config?.monsterScaling?.difficultyMultiplier) || DEFAULT_MONSTER_SCALING.difficultyMultiplier); const adjustments = normalizedDifficultyAdjustments(); const easyMultiplier = normalBase * Math.max(0.05, 1 + adjustments.easy / 100); const hardMultiplier = normalBase * Math.max(0.05, 1 + adjustments.hard / 100); if(els.difficultyNormalPreview) els.difficultyNormalPreview.textContent = `${formatMultiplier(normalBase)}×`; if(els.difficultyEasyPreview) els.difficultyEasyPreview.textContent = `${formatMultiplier(easyMultiplier)}×`; if(els.difficultyHardPreview) els.difficultyHardPreview.textContent = `${formatMultiplier(hardMultiplier)}×`; renderMonsterPreviewTable(); }
      function migrateLegacyDropRates(raw){ if(!raw) return cloneDropRates(DEFAULT_DROP_RATES); const result = {}; Object.keys(DEFAULT_DROP_RATES).forEach(function(k){ const def = DEFAULT_DROP_RATES[k]; const item = raw[k]; if(item && typeof item==='object' && (item.base!==undefined || item.perLevel!==undefined || item.max!==undefined)){ result[k] = { base: Number(item.base), perLevel: Number(item.perLevel), max: Number(item.max) }; } else if(typeof item==='number'){ result[k] = { base: item, perLevel: 0, max: Math.min(1, Math.max(item, 0)) }; } else { result[k] = { ...def }; } }); return normalizeDropRates(result); }

      // Math helpers
      function normalize(weights){ const total = Object.values(weights).reduce((a,b)=>a+b,0); if(!(total>0)) return Object.fromEntries(TIERS.map(t=>[t,0])); return Object.fromEntries(TIERS.map(t=>[t, weights[t]/total])); }
      async function sha256Hex(str){ try {
        if(typeof crypto!=='undefined' && crypto.subtle && typeof TextEncoder!=='undefined'){
          const enc = new TextEncoder().encode(str);
          const buf = await crypto.subtle.digest('SHA-256', enc);
          const b = new Uint8Array(buf);
          return Array.from(b).map(v=>v.toString(16).padStart(2,'0')).join('');
        }
      } catch { /* fall through to simple hash */ }
        // Fallback: simple deterministic hash (not secure, demo only)
        let h = 5381;
        for(let i=0;i<str.length;i++){ h = ((h<<5)+h) ^ str.charCodeAt(i); h|=0; }
        const hex = (h>>>0).toString(16).padStart(8,'0');
        return hex.repeat(8).slice(0,64);
      }

      // Build weights table
      function buildWeightsTable(tableBody = null, prefix = ''){
        const tbody = tableBody || els.weightsTable;
        if (!tbody) return;
        const dataAttr = prefix ? `data-${prefix}-tier` : 'data-tier';
        const inputClass = prefix ? `${prefix}winput` : 'winput';

        tbody.innerHTML='';
        for(const tier of TIERS){
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="tier ${tier}">${tier}</td>
            <td>
              <div class="input-group">
                <button type="button" class="step-btn step-minus" ${dataAttr}="${tier}" data-delta="-0.1">-</button>
                <input type="text" step="any" min="0" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" ${dataAttr}="${tier}" class="${inputClass}" style="width:80px" />
                <button type="button" class="step-btn step-plus" ${dataAttr}="${tier}" data-delta="0.1">+</button>
              </div>
            </td>
            <td class="prob" data-prob="${tier}">-</td>`;
          tbody.appendChild(tr);
        }
        if (!prefix) updateWeightsInputs();
        else setTimeout(() => updateAdminWeightsInputs(), 0);
      }

      function buildCharacterWeightsTable(tableBody = null, prefix = ''){
        const tbody = tableBody || els.characterWeightsBody;
        if (!tbody) return;
        const dataAttr = prefix ? `data-${prefix}-char-tier` : 'data-char-tier';
        const inputClass = prefix ? `${prefix}cwinput` : 'cwinput';
        const probAttr = prefix ? `data-${prefix}-char-prob` : 'data-char-prob';

        tbody.innerHTML='';
        for(const tier of TIERS){
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="tier ${tier}">${tier}</td>
            <td>
              <div class="input-group">
                <button type="button" class="step-btn step-minus" ${dataAttr}="${tier}" data-delta="-0.1">-</button>
                <input type="text" step="any" min="0" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" ${dataAttr}="${tier}" class="${inputClass}" style="width:80px" />
                <button type="button" class="step-btn step-plus" ${dataAttr}="${tier}" data-delta="0.1">+</button>
              </div>
            </td>
            <td class="prob" ${probAttr}="${tier}">-</td>`;
          tbody.appendChild(tr);
        }
        if (!prefix) updateCharacterWeightsInputs();
        else setTimeout(() => updateAdminCharacterWeightsInputs(), 0);
      }

      function updateWeightsInputs(){ if(!els.mode || !els.weightsTable) return; const mode = els.mode.value; const cfg = state.config; const weights = cfg.weights; cfg.probs = normalize(weights);
        const dis = cfg.locked || !isAdmin();
        $$('.winput').forEach(inp=>{ const t = inp.dataset.tier; inp.disabled = dis; inp.value = mode==='weight' ? weights[t] : (cfg.probs[t]*100).toFixed(5); });
        for(const t of TIERS){ const td = els.weightsTable.querySelector(`[data-prob="${t}"]`); if(td) td.textContent = formatPct(cfg.probs[t]); }
        updateCharacterWeightsInputs();
        updateAdminWeightsInputs();
        updateAdminCharacterWeightsInputs();
        syncStats(); drawChart(); }

      function updateCharacterWeightsInputs(){ if(!els.characterWeightsBody || !els.mode) return; const mode = els.mode.value; const cfg = state.config; const weights = cfg.characterWeights || sanitizeWeights(null); cfg.characterWeights = weights; cfg.characterProbs = normalize(weights); const disabled = cfg.locked || !isAdmin();
        els.characterWeightsBody.querySelectorAll('input[data-char-tier]').forEach((input)=>{ const tier = input.dataset.charTier; const weight = weights[tier]; input.disabled = disabled; if(mode === 'weight'){ input.value = weight; } else { input.value = (cfg.characterProbs[tier] * 100).toFixed(5); } });
        for(const tier of TIERS){ const cell = els.characterWeightsBody.querySelector(`[data-char-prob="${tier}"]`); if(cell) cell.textContent = formatPct(cfg.characterProbs[tier] || 0); }
      }

      function updateAdminWeightsInputs(){ if(!els.adminMode || !els.adminWeightsTable) return; const mode = els.adminMode.value; const cfg = state.config; const weights = cfg.weights; cfg.probs = normalize(weights);
        const dis = cfg.locked || !isAdmin();
        $$('.adminwinput').forEach(inp=>{ const t = inp.dataset.adminTier; if(t && weights[t] !== undefined) { inp.disabled = dis; inp.value = mode==='weight' ? weights[t] : (cfg.probs[t]*100).toFixed(5); } });
        if(els.adminWeightsTable) {
          for(const t of TIERS){ const td = els.adminWeightsTable.querySelector(`[data-prob="${t}"]`); if(td) td.textContent = formatPct(cfg.probs[t] || 0); }
        }
        syncStats(); drawChart(); }

      function updateAdminCharacterWeightsInputs(){ if(!els.adminCharacterWeightsBody || !els.adminMode) return; const mode = els.adminMode.value; const cfg = state.config; const weights = cfg.characterWeights || sanitizeWeights(null); cfg.characterWeights = weights; cfg.characterProbs = normalize(weights); const disabled = cfg.locked || !isAdmin();
        els.adminCharacterWeightsBody.querySelectorAll('input[data-admin-char-tier]').forEach((input)=>{ const tier = input.dataset.adminCharTier; const weight = weights[tier]; input.disabled = disabled; if(mode === 'weight'){ input.value = weight; } else { input.value = (cfg.characterProbs[tier] * 100).toFixed(5); } });
        if(els.adminCharacterWeightsBody) {
          for(const tier of TIERS){ const cell = els.adminCharacterWeightsBody.querySelector(`[data-admin-char-prob="${tier}"]`); if(cell) cell.textContent = formatPct(cfg.characterProbs[tier] || 0); }
        }
      }

      function applyInputsToConfig(){ if(!els.mode) return; const mode = els.mode.value; const weights = {...state.config.weights}; $$('.winput').forEach(inp=>{ const t=inp.dataset.tier; const raw = (inp.value||'').replace(',', '.'); let v=parseFloat(raw); if(!(v>=0)) v=0; if(mode==='weight'){ weights[t]=v; } else { weights[t]=v/100 || 0; } }); if(mode==='percent'){ const sum = TIERS.reduce((s,t)=>s+weights[t],0); if(sum>0){ for(const t of TIERS){ weights[t] = weights[t]/sum; } } }
        state.config.weights = weights; state.config.probs = normalize(weights); if(isAdmin()) clearActivePreset(); }

      function applyCharacterInputsToConfig(){ if(!els.characterWeightsBody || !els.mode) return; const mode = els.mode.value; const weights = {...state.config.characterWeights}; els.characterWeightsBody.querySelectorAll('input[data-char-tier]').forEach((input)=>{ const tier = input.dataset.charTier; const raw = (input.value||'').replace(',', '.'); let value = parseFloat(raw); if(!(value>=0)) value = 0; if(mode === 'weight'){ weights[tier] = value; } else { weights[tier] = value/100 || 0; } }); if(mode === 'percent'){ const sum = TIERS.reduce((acc, tier)=> acc + weights[tier], 0); if(sum>0){ TIERS.forEach((tier)=>{ weights[tier] = weights[tier]/sum; }); } }
        state.config.characterWeights = weights; state.config.characterProbs = normalize(weights); if(isAdmin()) clearActivePreset(); }

      function applyAdminInputsToConfig(){ if(!els.adminMode) return; const mode = els.adminMode.value; const weights = {...state.config.weights}; $$('.adminwinput').forEach(inp=>{ const t=inp.dataset.adminTier; const raw = (inp.value||'').replace(',', '.'); let v=parseFloat(raw); if(!(v>=0)) v=0; if(mode==='weight'){ weights[t]=v; } else { weights[t]=v/100 || 0; } }); if(mode==='percent'){ const sum = TIERS.reduce((s,t)=>s+weights[t],0); if(sum>0){ for(const t of TIERS){ weights[t] = weights[t]/sum; } } }
        state.config.weights = weights; state.config.probs = normalize(weights); if(isAdmin()) clearActivePreset(); }

      function applyAdminCharacterInputsToConfig(){ if(!els.adminCharacterWeightsBody || !els.adminMode) return; const mode = els.adminMode.value; const weights = {...state.config.characterWeights}; els.adminCharacterWeightsBody.querySelectorAll('input[data-admin-char-tier]').forEach((input)=>{ const tier = input.dataset.adminCharTier; const raw = (input.value||'').replace(',', '.'); let value = parseFloat(raw); if(!(value>=0)) value = 0; if(mode === 'weight'){ weights[tier] = value; } else { weights[tier] = value/100 || 0; } }); if(mode === 'percent'){ const sum = TIERS.reduce((acc, tier)=> acc + weights[tier], 0); if(sum>0){ TIERS.forEach((tier)=>{ weights[tier] = weights[tier]/sum; }); } }
        state.config.characterWeights = weights; state.config.characterProbs = normalize(weights); if(isAdmin()) clearActivePreset(); }

      function syncAdminPityControls() {
        if (els.adminPityEnabled) els.adminPityEnabled.checked = state.config.pity.enabled;
        if (els.adminPityFloor) els.adminPityFloor.value = state.config.pity.floorTier;
        if (els.adminPitySpan) els.adminPitySpan.value = state.config.pity.span;
        if (els.adminG10Enabled) els.adminG10Enabled.checked = state.config.minGuarantee10.enabled;
        if (els.adminG10Tier) els.adminG10Tier.value = state.config.minGuarantee10.tier;
      }

      function syncRegularPityControls() {
        if (els.pityEnabled) els.pityEnabled.checked = state.config.pity.enabled;
        if (els.pityFloor) els.pityFloor.value = state.config.pity.floorTier;
        if (els.pitySpan) els.pitySpan.value = state.config.pity.span;
        if (els.g10Enabled) els.g10Enabled.checked = state.config.minGuarantee10.enabled;
        if (els.g10Tier) els.g10Tier.value = state.config.minGuarantee10.tier;
      }

      function refreshCharacterProbCells(){ if(!els.characterWeightsBody) return; const probs = state.config.characterProbs || {};
        if(els.characterWeightsBody) {
          for(const tier of TIERS){ const cell = els.characterWeightsBody.querySelector(`[data-char-prob="${tier}"]`); if(cell) cell.textContent = formatPct(probs[tier] || 0); }
        }
        updateAdminCharacterWeightsInputs();
        // 확률 테이블도 업데이트
        updateProbabilityTables();
      }

      function refreshProbsAndStats(){ // update only probability cells and stats, do not overwrite input fields
        const probs = state.config.probs;
        if(els.weightsTable) {
          for(const t of TIERS){ const td = els.weightsTable.querySelector(`[data-prob="${t}"]`); if(td) td.textContent = formatPct(probs[t]); }
        }
        updateAdminWeightsInputs();
        updateAdminCharacterWeightsInputs();
        syncStats(); drawChart();
        // 확률 테이블도 업데이트
        console.log('🔄 기본 확률이 변경됨 - 확률 테이블 업데이트');
        updateProbabilityTables();
      }

      // UI bindings
      function bind(){ addListener(els.mode, 'change', ()=>{ updateWeightsInputs(); syncAdminConfigMirrors(); });
        if(els.adminMode && els.mode){
          addListener(els.adminMode, 'change', ()=>{
            if(els.mode && els.mode.value !== els.adminMode.value){
              els.mode.value = els.adminMode.value;
              els.mode.dispatchEvent(new window.Event('change'));
            }
          });
        }
        // On typing, update config and probs without overwriting the user's current text
        if(els.weightsTable){
          addListener(els.weightsTable, 'input', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(state.config.locked || !isAdmin()) return; applyInputsToConfig(); refreshProbsAndStats(); markProfileDirty(); });
          // On commit (change/blur), format inputs from config
          addListener(els.weightsTable, 'change', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(state.config.locked || !isAdmin()) return; updateWeightsInputs(); });
          // Step button handlers for gear weights
          addListener(els.weightsTable, 'click', (e)=>{
            if(!(e.target instanceof HTMLButtonElement) || !e.target.classList.contains('step-btn')) return;
            if(state.config.locked || !isAdmin()) return;
            const tier = e.target.dataset.tier;
            const delta = parseFloat(e.target.dataset.delta);
            if(!tier || !isFinite(delta)) return;
            const input = els.weightsTable.querySelector(`input[data-tier="${tier}"]`);
            if(!input) return;
            const currentVal = parseFloat(input.value.replace(',', '.')) || 0;
            const newVal = Math.max(0, currentVal + delta);
            input.value = newVal.toFixed(1);
            applyInputsToConfig(); refreshProbsAndStats(); markProfileDirty();
          });
        }
        if(els.characterWeightsTable){
          els.characterWeightsTable.addEventListener('input', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(!e.target.dataset.charTier) return; if(state.config.locked || !isAdmin()) return; applyCharacterInputsToConfig(); refreshCharacterProbCells(); markProfileDirty(); });
          els.characterWeightsTable.addEventListener('change', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(!e.target.dataset.charTier) return; if(state.config.locked || !isAdmin()) return; updateCharacterWeightsInputs(); });
          // Step button handlers for character weights
          els.characterWeightsTable.addEventListener('click', (e)=>{
            if(!(e.target instanceof HTMLButtonElement) || !e.target.classList.contains('step-btn')) return;
            if(state.config.locked || !isAdmin()) return;
            const tier = e.target.dataset.charTier;
            const delta = parseFloat(e.target.dataset.delta);
            if(!tier || !isFinite(delta)) return;
            const input = els.characterWeightsTable.querySelector(`input[data-char-tier="${tier}"]`);
            if(!input) return;
            const currentVal = parseFloat(input.value.replace(',', '.')) || 0;
            const newVal = Math.max(0, currentVal + delta);
            input.value = newVal.toFixed(1);
            applyCharacterInputsToConfig(); refreshCharacterProbCells(); markProfileDirty();
          });
        }

        // Admin weight table event handlers
        if(els.adminWeightsTable){
          addListener(els.adminWeightsTable, 'input', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(state.config.locked || !isAdmin()) return; applyAdminInputsToConfig(); refreshProbsAndStats(); markProfileDirty(); });
          addListener(els.adminWeightsTable, 'change', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(state.config.locked || !isAdmin()) return; updateAdminWeightsInputs(); });
          addListener(els.adminWeightsTable, 'click', (e)=>{
            if(!(e.target instanceof HTMLButtonElement) || !e.target.classList.contains('step-btn')) return;
            if(state.config.locked || !isAdmin()) return;
            const tier = e.target.dataset.adminTier;
            const delta = parseFloat(e.target.dataset.delta);
            if(!tier || !isFinite(delta)) return;
            const input = els.adminWeightsTable.querySelector(`input[data-admin-tier="${tier}"]`);
            if(!input) return;
            const currentVal = parseFloat(input.value.replace(',', '.')) || 0;
            const newVal = Math.max(0, currentVal + delta);
            input.value = newVal.toFixed(1);
            applyAdminInputsToConfig(); refreshProbsAndStats(); markProfileDirty();
          });
        }

        if(els.adminCharacterWeightsTable){
          addListener(els.adminCharacterWeightsTable, 'input', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(!e.target.dataset.adminCharTier) return; if(state.config.locked || !isAdmin()) return; applyAdminCharacterInputsToConfig(); refreshCharacterProbCells(); markProfileDirty(); });
          addListener(els.adminCharacterWeightsTable, 'change', (e)=>{ if(!(e.target instanceof HTMLInputElement)) return; if(!e.target.dataset.adminCharTier) return; if(state.config.locked || !isAdmin()) return; updateAdminCharacterWeightsInputs(); });
          addListener(els.adminCharacterWeightsTable, 'click', (e)=>{
            if(!(e.target instanceof HTMLButtonElement) || !e.target.classList.contains('step-btn')) return;
            if(state.config.locked || !isAdmin()) return;
            const tier = e.target.dataset.adminCharTier;
            const delta = parseFloat(e.target.dataset.delta);
            if(!tier || !isFinite(delta)) return;
            const input = els.adminCharacterWeightsTable.querySelector(`input[data-admin-char-tier="${tier}"]`);
            if(!input) return;
            const currentVal = parseFloat(input.value.replace(',', '.')) || 0;
            const newVal = Math.max(0, currentVal + delta);
            input.value = newVal.toFixed(1);
            applyAdminCharacterInputsToConfig(); refreshCharacterProbCells(); markProfileDirty();
          });
        }

        if(els.characterBalanceTable){
          els.characterBalanceTable.addEventListener('input', handleCharacterBalanceInput);
          els.characterBalanceTable.addEventListener('change', ()=> updateCharacterBalanceInputs());
        }
        if(els.characterBalanceOffsetTable){
          els.characterBalanceOffsetTable.addEventListener('input', handleCharacterBalanceOffsetInput);
          els.characterBalanceOffsetTable.addEventListener('change', ()=> updateCharacterBalanceInputs());
        }
        addListener(els.seed, 'input', ()=>{ state.config.seed = els.seed.value.trim(); syncAdminConfigMirrors(); markProfileDirty(); });
        if(els.adminSeed && els.seed){
          addListener(els.adminSeed, 'input', ()=>{
            if(els.seed && els.seed.value !== els.adminSeed.value){
              els.seed.value = els.adminSeed.value;
              els.seed.dispatchEvent(new window.Event('input'));
            }
          });
        }
        if(els.gachaModeGearConfig) els.gachaModeGearConfig.addEventListener('click', ()=> updateGachaModeView('gear'));
        if(els.gachaModePetConfig) els.gachaModePetConfig.addEventListener('click', ()=> updateGachaModeView('pet'));
        if(els.gachaModeCharacterConfig) els.gachaModeCharacterConfig.addEventListener('click', ()=> updateGachaModeView('character'));

        // Admin page gacha mode controls
        if(els.adminGachaModeGearConfig) els.adminGachaModeGearConfig.addEventListener('click', ()=> updateAdminGachaModeView('gear'));
        if(els.adminGachaModePetConfig) els.adminGachaModePetConfig.addEventListener('click', ()=> updateAdminGachaModeView('pet'));
        if(els.adminGachaModeCharacterConfig) els.adminGachaModeCharacterConfig.addEventListener('click', ()=> updateAdminGachaModeView('character'));
        // 확률 표시 모드 변경 이벤트
        if(els.probDisplayModeGear) els.probDisplayModeGear.addEventListener('click', ()=> handleProbabilityDisplayModeChange('gear'));
        if(els.probDisplayModeCharacter) els.probDisplayModeCharacter.addEventListener('click', ()=> handleProbabilityDisplayModeChange('character'));
        if(els.adminProbDisplayModeGear) els.adminProbDisplayModeGear.addEventListener('click', ()=> handleProbabilityDisplayModeChange('gear'));
        if(els.adminProbDisplayModeCharacter) els.adminProbDisplayModeCharacter.addEventListener('click', ()=> handleProbabilityDisplayModeChange('character'));
        if(els.gachaModeGearDraw) els.gachaModeGearDraw.addEventListener('click', ()=> updateGachaModeView('gear'));
        if(els.gachaModePetDraw) els.gachaModePetDraw.addEventListener('click', ()=> updateGachaModeView('pet'));
        if(els.gachaModeCharacterDraw) els.gachaModeCharacterDraw.addEventListener('click', ()=> updateGachaModeView('character'));
        if(els.rareAnimationSkip){ els.rareAnimationSkip.addEventListener('click', (event)=>{
          event.preventDefault();
          event.stopPropagation();
          skipRareAnimation();
        }); setRareAnimationSkippable(true); }
        if(els.rareAnimationOverlay){
          els.rareAnimationOverlay.addEventListener('click', (event)=>{
            if(event.target === els.rareAnimationOverlay){
              event.preventDefault();
              event.stopPropagation();
            }
          });
        }
        addListener(els.lock, 'change', ()=>{ state.config.locked = els.lock.checked; syncAdminConfigMirrors(); updateWeightsInputs(); toggleConfigDisabled(); markProfileDirty(); });
        if(els.adminLock && els.lock){
          addListener(els.adminLock, 'change', ()=>{
            if(els.lock && els.lock.checked !== els.adminLock.checked){
              els.lock.checked = els.adminLock.checked;
              els.lock.dispatchEvent(new window.Event('change'));
            }
          });
        }
        addListener(els.pityEnabled, 'change', ()=>{ state.config.pity.enabled = els.pityEnabled.checked; syncAdminPityControls(); markProfileDirty(); });
        addListener(els.pityFloor, 'change', ()=>{ state.config.pity.floorTier = els.pityFloor.value; syncAdminPityControls(); markProfileDirty(); });
        addListener(els.pitySpan, 'input', ()=>{ state.config.pity.span = Math.max(1, parseInt(els.pitySpan?.value||'1')); syncAdminPityControls(); markProfileDirty(); });
        addListener(els.g10Enabled, 'change', ()=>{ state.config.minGuarantee10.enabled = els.g10Enabled.checked; syncAdminPityControls(); markProfileDirty(); });
        addListener(els.g10Tier, 'change', ()=>{ state.config.minGuarantee10.tier = els.g10Tier.value; syncAdminPityControls(); markProfileDirty(); });

        // Admin pity controls
        addListener(els.adminPityEnabled, 'change', ()=>{ state.config.pity.enabled = els.adminPityEnabled.checked; syncRegularPityControls(); markProfileDirty(); });
        addListener(els.adminPityFloor, 'change', ()=>{ state.config.pity.floorTier = els.adminPityFloor.value; syncRegularPityControls(); markProfileDirty(); });
        addListener(els.adminPitySpan, 'input', ()=>{ state.config.pity.span = Math.max(1, parseInt(els.adminPitySpan?.value||'1')); syncRegularPityControls(); markProfileDirty(); });
        addListener(els.adminG10Enabled, 'change', ()=>{ state.config.minGuarantee10.enabled = els.adminG10Enabled.checked; syncRegularPityControls(); markProfileDirty(); });
        addListener(els.adminG10Tier, 'change', ()=>{ state.config.minGuarantee10.tier = els.adminG10Tier.value; syncRegularPityControls(); markProfileDirty(); });
        GEAR_PRESET_IDS.forEach((presetId)=>{
          const btn = els[presetId];
          if(btn){
            btn.addEventListener('click', ()=>{
              const preset = getDrawPreset('gear', presetId);
              if(!preset){ setDrawMessage('뽑기 프리셋 구성을 찾을 수 없습니다.', 'warn'); return; }
              runDraws(preset);
            });
          }
        });
        CHARACTER_PRESET_IDS.forEach((presetId)=>{
          const btn = els[presetId];
          if(btn){
            btn.addEventListener('click', ()=>{
              const preset = getDrawPreset('character', presetId);
              if(!preset){ setDrawMessage('뽑기 프리셋 구성을 찾을 수 없습니다.', 'warn'); return; }
              runCharacterDraws(preset);
            });
          }
        });
        if(els.gachaPresetGearBody){
          els.gachaPresetGearBody.addEventListener('input', handleDrawPresetInput);
          els.gachaPresetGearBody.addEventListener('change', handleDrawPresetChange);
          els.gachaPresetGearBody.addEventListener('click', handleDrawPresetClick);
        }
        if(els.gachaPresetCharacterBody){
          els.gachaPresetCharacterBody.addEventListener('input', handleDrawPresetInput);
          els.gachaPresetCharacterBody.addEventListener('change', handleDrawPresetChange);
          els.gachaPresetCharacterBody.addEventListener('click', handleDrawPresetClick);
        }
        if(els.gearPresetReset){ els.gearPresetReset.addEventListener('click', ()=> resetDrawPresetGroup('gear')); }
        if(els.characterPresetReset){ els.characterPresetReset.addEventListener('click', ()=> resetDrawPresetGroup('character')); }
        if (els.drawPet1) els.drawPet1.addEventListener('click', ()=> runPetDraws(1));
        if (els.drawPet10) els.drawPet10.addEventListener('click', ()=> runPetDraws(10));
        addListener(els.cancel, 'click', ()=>{ state.cancelFlag = true; setDrawMessage('뽑기를 중단합니다...', 'warn'); });
        addListener(els.scope, 'change', ()=>{ syncStats(); drawChart(); });
        if (els.petWeightTableBody) {
          els.petWeightTableBody.addEventListener('input', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) return;
            const petId = target.dataset.pet;
            if (!petId || !PET_IDS.includes(petId)) return;
            if (!isAdmin() || state.config.locked) {
              updatePetWeightInputs();
              return;
            }
            let value = parseFloat(target.value);
            if (!Number.isFinite(value) || value < 0) value = 0;
            state.petGachaWeights[petId] = value;
            state.config.petWeights = { ...state.petGachaWeights };
            markProfileDirty();
            renderPetStats();
            updatePetWeightInputs();
          });
        }

        if (els.adminPetWeightTableBody) {
          els.adminPetWeightTableBody.addEventListener('input', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) return;
            const petId = target.dataset.adminPet;
            if (!petId || !PET_IDS.includes(petId)) return;
            if (!isAdmin() || state.config.locked) {
              updateAdminPetWeightInputs();
              return;
            }
            let value = parseFloat(target.value);
            if (!Number.isFinite(value) || value < 0) value = 0;
            state.petGachaWeights[petId] = value;
            state.config.petWeights = { ...state.petGachaWeights };
            markProfileDirty();
            renderPetStats();
            updateAdminPetWeightInputs();
            // Also sync the regular pet table
            updatePetWeightInputs();
          });
        }

        if (els.statsMode) els.statsMode.addEventListener('change', ()=>{
          const value = els.statsMode.value;
          if(value === 'pet'){
            updateGachaModeView('pet');
          } else if(value === 'character'){
            updateGachaModeView('character');
          } else {
            updateGachaModeView('gear');
          }
        });
        if(els.userOptionsBtn) els.userOptionsBtn.addEventListener('click', openUserOptionsModal);
        if(els.userOptionsClose) els.userOptionsClose.addEventListener('click', ()=> closeUserOptionsModal());
        if(els.userOptionsSave) els.userOptionsSave.addEventListener('click', saveUserOptions);
        if(els.userOptionsModal){ els.userOptionsModal.addEventListener('click', (event)=>{ if(event.target === els.userOptionsModal){ closeUserOptionsModal(); } }); }
        if(els.questBtn) els.questBtn.addEventListener('click', ()=> openQuestModal());
        if(els.questClose) els.questClose.addEventListener('click', ()=> closeQuestModal());
        if(els.questOverlay){ els.questOverlay.addEventListener('click', (event)=>{ if(event.target === els.questOverlay){ closeQuestModal(); } }); }
        if(els.questList){
          els.questList.addEventListener('click', (event)=>{
            const rawTarget = event.target;
            const target = rawTarget instanceof HTMLButtonElement
              ? rawTarget
              : rawTarget instanceof Element
                ? rawTarget.closest('.quest-claim')
                : null;
            if(!(target instanceof HTMLButtonElement)) return;
            if(target.disabled) return;
            const questId = target.dataset.questId;
            if(!questId) return;
            target.disabled = true;
            claimQuestReward(questId).then((ok)=>{
              if(!ok){
                target.disabled = false;
              }
            });
          });
        }
        if(els.saveCfg) els.saveCfg.addEventListener('click', saveConfigFile);
        if(els.loadCfg && els.cfgFile){
          els.loadCfg.addEventListener('click', ()=> els.cfgFile.click());
          els.cfgFile.addEventListener('change', loadConfigFile);
        }
        if(els.shareLink) els.shareLink.addEventListener('click', shareLink);
        const exportCsvBtn = $('#exportCsv');
        if(exportCsvBtn) addListener(exportCsvBtn, 'click', exportCsv);
        if (els.resetSession) els.resetSession.addEventListener('click', resetSession);
        if (els.resetGlobal) els.resetGlobal.addEventListener('click', resetGlobal);
        if (els.characterDetailClose) els.characterDetailClose.addEventListener('click', closeCharacterDetail);
        if (els.characterDetailModal) {
          els.characterDetailModal.addEventListener('click', (event) => {
            if (event.target === els.characterDetailModal || event.target.classList.contains('character-modal__backdrop')) {
              closeCharacterDetail();
            }
          });
        }
        // combat
        if(els.monLevel){ els.monLevel.addEventListener('input', ()=>{ setLevel(parseInt(els.monLevel.value||'1',10)); }); }
        if(els.nextMonster){ els.nextMonster.addEventListener('click', ()=>{ const rng = getRng(); const lvl = 1 + Math.floor(rng()*999); setLevel(lvl); }); }
        if(els.lvlDec){ els.lvlDec.addEventListener('click', ()=>{ const cur = parseInt(els.monLevel?.value||'1',10); setLevel(cur-1); }); }
        if(els.lvlInc){ els.lvlInc.addEventListener('click', ()=>{ const cur = parseInt(els.monLevel?.value||'1',10); setLevel(cur+1); }); }
        if(els.fightBtn){ els.fightBtn.addEventListener('click', doFight); }
        addListener(els.forgeTarget, 'change', ()=>{ updateForgeInfo(); updateGearShardView(); });
        // forge
        addListener(els.forgeOnce, 'click', doForgeOnce);
        if(els.forgeAuto){ els.forgeAuto.addEventListener('click', toggleAutoForge); }
        addListener(els.forgeTicket, 'click', doForgeTicket);
        addListener(els.forgeTicketProtect, 'click', doForgeTicketProtect);
        addListener(els.forgeTicketAuto, 'click', doForgeTicketAuto);
        // forge tabs
        document.querySelectorAll('.forge-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            const targetTab = tab.dataset.forgeTab;
            switchForgeTab(targetTab);
          });
        });
        addListener(els.logoutBtn, 'click', logout);
        addListener(els.toAdmin, 'click', ()=>{
          if(!isAdmin()) {
            alert('관리자만 접근 가능합니다.');
            return;
          }
          state.ui.adminView = true;
          updateViewMode();
          // Initialize admin tabs after switching to admin view
          setTimeout(initAdminTabs, 100);
        });

        // Admin tab functionality
        function initAdminTabs() {
          console.log('Initializing admin tabs...');

          const tabs = document.querySelectorAll('.admin-tab');
          const adminPanel = document.getElementById('adminPanel');

          console.log('Found tabs:', tabs.length);
          console.log('Found admin panel:', !!adminPanel);

          if (tabs.length === 0 || !adminPanel) {
            console.log('Admin tabs or panel not found, retrying...');
            setTimeout(initAdminTabs, 200);
            return;
          }

          if (adminPanel.dataset.tabsInitialized === 'true') {
            return;
          }

          tabs.forEach(tab => {
            // Remove any existing listeners
            tab.onclick = null;

            tab.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();

              const targetTab = tab.getAttribute('data-tab');
              console.log('Tab clicked:', targetTab);

              // Remove active class from all tabs
              tabs.forEach(t => t.classList.remove('active'));
              // Add active class to clicked tab
              tab.classList.add('active');

              // Remove all show classes
              adminPanel.classList.remove('show-difficulty', 'show-character', 'show-gacha', 'show-shop', 'show-backup', 'show-rewards');

              // Add appropriate show class
              if (targetTab === 'difficulty') {
                adminPanel.classList.add('show-difficulty');
                console.log('Showing difficulty tab');
              } else if (targetTab === 'character') {
                adminPanel.classList.add('show-character');
                console.log('Showing character tab');
              } else if (targetTab === 'gacha') {
                adminPanel.classList.add('show-gacha');
                console.log('Showing gacha tab');
              } else if (targetTab === 'shop') {
                adminPanel.classList.add('show-shop');
                console.log('Showing shop tab');
              } else if (targetTab === 'backup') {
                adminPanel.classList.add('show-backup');
                console.log('Showing backup tab');
              } else if (targetTab === 'rewards') {
                adminPanel.classList.add('show-rewards');
                console.log('Showing rewards tab');
              }
            });
          });

          if(!adminPanel.classList.contains('show-difficulty') &&
             !adminPanel.classList.contains('show-character') &&
             !adminPanel.classList.contains('show-gacha') &&
             !adminPanel.classList.contains('show-shop') &&
             !adminPanel.classList.contains('show-backup') &&
             !adminPanel.classList.contains('show-rewards')){
            adminPanel.classList.add('show-difficulty');
          }

          adminPanel.dataset.tabsInitialized = 'true';
        }

        // Gacha tab functionality
        function initGachaTabs() {
          console.log('Initializing gacha tabs...');

          const gachaTabs = document.querySelectorAll('.gacha-tab');
          const gachaPanel = document.getElementById('gachaPanel');

          console.log('Found gacha tabs:', gachaTabs.length);
          console.log('Found gacha panel:', !!gachaPanel);

          if (gachaTabs.length === 0 || !gachaPanel) {
            console.log('Gacha tabs or panel not found, retrying...');
            setTimeout(initGachaTabs, 200);
            return;
          }

          if (gachaPanel.dataset.tabsInitialized === 'true') {
            return;
          }

          gachaTabs.forEach(tab => {
            // Remove any existing listeners
            tab.onclick = null;

            tab.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();

              const targetTab = tab.getAttribute('data-tab');
              console.log('Gacha tab clicked:', targetTab);

              // Remove active class from all tabs
              gachaTabs.forEach(t => t.classList.remove('active'));
              // Add active class to clicked tab
              tab.classList.add('active');

              // Remove all show classes
              gachaPanel.classList.remove('show-draw', 'show-config', 'show-stats', 'show-log');

              // Add appropriate show class
              if (targetTab === 'draw') {
                gachaPanel.classList.add('show-draw');
                console.log('Showing draw tab');
              } else if (targetTab === 'config') {
                gachaPanel.classList.add('show-config');
                console.log('Showing config tab');
                // 🔧 확률 탭 클릭 시 확률 테이블 강제 업데이트
                console.log('🔄 확률 탭 활성화 - 확률 테이블 업데이트');
                setTimeout(() => {
                  updateProbabilityTables();
                }, 200);
              } else if (targetTab === 'stats') {
                gachaPanel.classList.add('show-stats');
                console.log('Showing stats tab');
              } else if (targetTab === 'log') {
                gachaPanel.classList.add('show-log');
                console.log('Showing log tab');
              }
            });
          });

          gachaPanel.dataset.tabsInitialized = 'true';

          // Set default to draw tab (뽑기)
          gachaPanel.classList.add('show-draw');
        }

        // Initialize gacha tabs when page loads
        initGachaTabs();

        // Initialize slot machine
        initSlotMachine();

        addListener(els.toUser, 'click', ()=>{ state.ui.adminView = false; updateViewMode(); });
        if(els.toBattle){ els.toBattle.addEventListener('click', ()=>{ window.location.href = 'battle.html'; }); }
        if(els.toPvp){ els.toPvp.addEventListener('click', ()=>{ window.location.href = 'pvp.html'; }); }
        if(els.goBattle){ els.goBattle.addEventListener('click', ()=>{ window.location.href = 'battle.html'; }); }
        addListener(els.adminChangePw, 'click', changeAdminPassword);
        if(els.legendaryOverlay){ els.legendaryOverlay.addEventListener('click', (event)=>{ if(!isLegendaryVisible()) return; if(event.target === els.legendaryOverlay && activeLegendaryType === 'gear'){ if(els.gearDiscardBtn) els.gearDiscardBtn.click(); } else if(event.target === els.legendaryOverlay && activeLegendaryType === 'character'){ if(els.characterLegendaryClose) els.characterLegendaryClose.click(); } }); }
        document.addEventListener('keydown', (event)=>{
          if(event.key === 'Escape'){
            if(isUserOptionsOpen()){
              event.preventDefault();
              closeUserOptionsModal();
              return;
            }
            if(els.rareAnimationOverlay && !els.rareAnimationOverlay.hidden && els.rareAnimationOverlay.classList.contains('visible')){
              event.preventDefault();
              skipRareAnimation();
              return;
            }
            if(isLegendaryVisible()){
              event.preventDefault();
              if(activeLegendaryType === 'gear'){ if(els.gearDiscardBtn) els.gearDiscardBtn.click(); }
              else if(activeLegendaryType === 'character'){ if(els.characterLegendaryClose) els.characterLegendaryClose.click(); }
              return;
            }
            if(state.ui.questOpen){
              event.preventDefault();
              closeQuestModal();
              return;
            }
            if(state.ui.characterDetailOpen){
              event.preventDefault();
              closeCharacterDetail();
            }
          }
        });
        if(els.saveDrops) els.saveDrops.addEventListener('click', ()=>{
          if(!isAdmin()) return;
          const parseDrop = (baseEl, perEl, maxEl, defaults)=>{
            const base = parseFloat(baseEl?.value);
            const per = parseFloat(perEl?.value);
            const max = parseFloat(maxEl?.value);
            return {
              base: (isFinite(base) && base>=0 && base<=1) ? base : defaults.base,
              perLevel: (isFinite(per) && per>=0) ? per : (defaults.perLevel||0),
              max: (isFinite(max) && max>=0 && max<=1) ? max : (defaults.max||1)
            };
          };
          const drops = {
            potion: parseDrop(els.dropPotionBase, els.dropPotionPer, els.dropPotionMax, DEFAULT_DROP_RATES.potion),
            hyperPotion: parseDrop(els.dropHyperBase, els.dropHyperPer, els.dropHyperMax, DEFAULT_DROP_RATES.hyperPotion),
            protect: parseDrop(els.dropProtectBase, els.dropProtectPer, els.dropProtectMax, DEFAULT_DROP_RATES.protect),
            enhance: parseDrop(els.dropEnhanceBase, els.dropEnhancePer, els.dropEnhanceMax, DEFAULT_DROP_RATES.enhance),
            battleRes: parseDrop(els.dropBattleResBase, els.dropBattleResPer, els.dropBattleResMax, DEFAULT_DROP_RATES.battleRes)
          };
          state.config.dropRates = normalizeDropRates(drops);

          const gold = normalizeGoldScaling({
            minLow: parseInt(els.goldMinLow?.value,10),
            maxLow: parseInt(els.goldMaxLow?.value,10),
            minHigh: parseInt(els.goldMinHigh?.value,10),
            maxHigh: parseInt(els.goldMaxHigh?.value,10)
          });
          state.config.goldScaling = gold;

          const parsePrice = (el, def)=>{ const v = parseInt(el?.value,10); return (isNaN(v)||v<0)? def : v; };
          const parseTimeSeconds = (el, fallbackSec)=>{
            const v = parseFloat(el?.value);
            return (isFinite(v) && v>=0) ? v : fallbackSec;
          };
          const parseMultiplier = (el, fallback)=>{
            const v = parseFloat(el?.value);
            return (isFinite(v) && v>0) ? v : fallback;
          };
          const sp = {
            potion: parsePrice(els.priceInputPotion, DEFAULT_SHOP_PRICES.potion),
            hyperPotion: parsePrice(els.priceInputHyper, DEFAULT_SHOP_PRICES.hyperPotion),
            protect: parsePrice(els.priceInputProtect, DEFAULT_SHOP_PRICES.protect),
            enhance: parsePrice(els.priceInputEnhance, DEFAULT_SHOP_PRICES.enhance),
            battleRes: parsePrice(els.priceInputBattleRes, DEFAULT_SHOP_PRICES.battleRes),
            starterPack: parsePrice(els.priceInputStarter, DEFAULT_SHOP_PRICES.starterPack)
          };
          state.config.shopPrices = normalizeShopPrices(sp);

          if(isAdmin()) clearActivePreset();
          const potionSettings = normalizePotionSettings({
            durationMs: Math.round(parseTimeSeconds(els.potionDuration, DEFAULT_POTION_SETTINGS.durationMs/1000)*1000),
            manualCdMs: Math.round(parseTimeSeconds(els.potionManualCd, DEFAULT_POTION_SETTINGS.manualCdMs/1000)*1000),
            autoCdMs: Math.round(parseTimeSeconds(els.potionAutoCd, DEFAULT_POTION_SETTINGS.autoCdMs/1000)*1000),
            speedMultiplier: parseMultiplier(els.potionSpeedMult, DEFAULT_POTION_SETTINGS.speedMultiplier)
          }, DEFAULT_POTION_SETTINGS);
          const hyperSettings = normalizePotionSettings({
            durationMs: Math.round(parseTimeSeconds(els.hyperDuration, DEFAULT_HYPER_POTION_SETTINGS.durationMs/1000)*1000),
            manualCdMs: Math.round(parseTimeSeconds(els.hyperManualCd, DEFAULT_HYPER_POTION_SETTINGS.manualCdMs/1000)*1000),
            autoCdMs: Math.round(parseTimeSeconds(els.hyperAutoCd, DEFAULT_HYPER_POTION_SETTINGS.autoCdMs/1000)*1000),
            speedMultiplier: parseMultiplier(els.hyperSpeedMult, DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier)
          }, DEFAULT_HYPER_POTION_SETTINGS);
          state.config.potionSettings = potionSettings;
          state.config.hyperPotionSettings = hyperSettings;
          const monsterRaw = {
            basePower: parseFloat(els.monsterBasePower?.value),
            maxPower: parseFloat(els.monsterMaxPower?.value),
            curve: parseFloat(els.monsterCurve?.value),
            difficultyMultiplier: parseFloat(els.monsterDifficultyInput?.value)
          };
          state.config.monsterScaling = normalizeMonsterScaling({ ...state.config.monsterScaling, ...monsterRaw });
          if(isAdmin()) clearActivePreset(); else clearSelectedPreset();
          markProfileDirty();
          reflectConfig();
          setAdminMsg('드랍 확률, 골드 보상, 상점 가격, 물약, 몬스터 난이도 설정이 저장되었습니다.', 'ok');
        });
        if(els.adminPresetSave) els.adminPresetSave.addEventListener('click', handleAdminPresetSave);
        if(els.adminPresetApply) els.adminPresetApply.addEventListener('click', ()=>{
          if(!isAdmin()) return; const id = els.adminPresetSelect?.value || ''; const preset = findGlobalPreset(id); if(!preset){ setAdminPresetMsg('적용할 프리셋을 선택하세요.', 'warn'); return; } applyAdminPreset(preset); });
        if(els.adminPresetLoad) els.adminPresetLoad.addEventListener('click', ()=>{
          if(!isAdmin()) return; const id = els.adminPresetSelect?.value || ''; const preset = findGlobalPreset(id); if(!preset){ setAdminPresetMsg('불러올 프리셋을 선택하세요.', 'warn'); return; } loadAdminPresetForEditing(preset); });
        if(els.adminPresetDelete) els.adminPresetDelete.addEventListener('click', handleAdminPresetDelete);
        if(els.adminUserSelect) els.adminUserSelect.addEventListener('change', ()=>{
          updateAdminUserStats();
          refreshAdminBackups({ silent: true });
        });
        if(els.adminUserSelect2) els.adminUserSelect2.addEventListener('change', ()=>{
          updateAdminUserStats();
          refreshAdminBackups({ silent: true });
        });
        if(els.adminUserSelect3) els.adminUserSelect3.addEventListener('change', ()=>{
          updateAdminUserStats();
          refreshAdminBackups({ silent: true });
        });
        if(els.adminBackupRefresh) els.adminBackupRefresh.addEventListener('click', ()=> refreshAdminBackups());
        if(els.adminRestoreFromMirror) els.adminRestoreFromMirror.addEventListener('click', restoreFromMirror);
        if(els.adminRestoreFromSnapshot) els.adminRestoreFromSnapshot.addEventListener('click', restoreFromSnapshot);
        if(els.adminGrantSubmit) els.adminGrantSubmit.addEventListener('click', handleAdminGrantResources);
        if(els.adminCouponSubmit) els.adminCouponSubmit.addEventListener('click', handleAdminCouponGrant);
        if(els.adminCouponUserSelect) els.adminCouponUserSelect.addEventListener('change', updateAdminCouponUserStats);
        if(els.applyGlobalPreset) els.applyGlobalPreset.addEventListener('click', ()=>{ const id = els.globalPresetSelect?.value || ''; if(!id){ clearSelectedPreset(); setPresetMsg('프리셋 선택을 해제했습니다.', 'warn'); return; } const preset = findGlobalPreset(id); if(!preset){ setPresetMsg('선택한 프리셋을 찾을 수 없습니다.', 'error'); return; } applyGlobalPresetForUser(preset); });
        if(els.applyPersonalPreset) els.applyPersonalPreset.addEventListener('click', ()=>{ const id = els.personalPresetSelect?.value || ''; if(!id){ clearSelectedPreset(); setPresetMsg('프리셋 선택을 해제했습니다.', 'warn'); return; } const preset = findPersonalPreset(id); if(!preset){ setPresetMsg('선택한 프리셋을 찾을 수 없습니다.', 'error'); return; } applyPersonalPresetForUser(preset); });
        if(els.savePersonalPreset) els.savePersonalPreset.addEventListener('click', handleSavePersonalPreset);
        if(els.toggleUserEdit) els.toggleUserEdit.addEventListener('click', ()=>{ if(isAdmin()) return; state.ui.userEditEnabled = !state.ui.userEditEnabled; updateUserEditModeView(); toggleConfigDisabled(); updateWeightsInputs(); setPresetMsg(state.ui.userEditEnabled ? '설정 편집 모드를 켰습니다.' : '설정 편집 모드를 껐습니다.', 'warn'); });
        if(els.flagAnimations){ els.flagAnimations.addEventListener('change', ()=>{ saveFlags({ animationsEnabled: !!els.flagAnimations.checked }); }); }
        if(els.flagBanners){ els.flagBanners.addEventListener('change', ()=>{ saveFlags({ bannersEnabled: !!els.flagBanners.checked }); }); }
        if(els.flagRewardsPreset){ els.flagRewardsPreset.addEventListener('change', ()=>{ saveFlags({ rewardsPreset: els.flagRewardsPreset.value || 'default' }); }); }
        if(els.rareAnimKind){ els.rareAnimKind.addEventListener('change', ()=>{ ensureAdminRareState(false); state.admin.rareKind = els.rareAnimKind.value === 'character' ? 'character' : 'gear'; renderRareAnimTable(true); renderRareAnimPreview(null); }); }
        if(els.rareAnimAdd){ els.rareAnimAdd.addEventListener('click', ()=>{ if(!isAdmin()) return; addRareAnimationRow(); }); }
        if(els.rareAnimReset){ els.rareAnimReset.addEventListener('click', ()=>{ if(!isAdmin()) return; resetRareAnimations(); }); }
        if(els.rareAnimSave){ els.rareAnimSave.addEventListener('click', ()=>{ if(!isAdmin()) return; saveRareAnimations(); }); }
        if(els.rareAnimRevert){ els.rareAnimRevert.addEventListener('click', ()=>{ if(!isAdmin()) return; reloadRareAnimationsFromConfig(); }); }
        if(els.rareAnimTableBody){
          els.rareAnimTableBody.addEventListener('input', handleRareAnimInput);
          els.rareAnimTableBody.addEventListener('change', handleRareAnimInput);
          els.rareAnimTableBody.addEventListener('click', handleRareAnimClick);
        }
        if(isAdmin()){
          updateFlagControls();
          refreshRareAnimationEditor({ force: true });
        }
        const adjustMonsterDifficulty = (delta)=>{
          if(!els.monsterDifficultyInput) return;
          const current = parseFloat(els.monsterDifficultyInput.value) || (state.config.monsterScaling?.difficultyMultiplier ?? 1);
          let next = current + delta;
          if(next < 0.1) next = 0.1;
          if(next > 10) next = 10;
          next = Math.round(next * 100) / 100;
          els.monsterDifficultyInput.value = formatMultiplier(next);
          state.config.monsterScaling = state.config.monsterScaling || { ...DEFAULT_MONSTER_SCALING };
          state.config.monsterScaling.difficultyMultiplier = next;
          updateDifficultyPreview();
          markProfileDirty();
        };
        if(els.monsterDifficultyMinus){ els.monsterDifficultyMinus.addEventListener('click', ()=> adjustMonsterDifficulty(-0.1)); }
        if(els.monsterDifficultyPlus){ els.monsterDifficultyPlus.addEventListener('click', ()=> adjustMonsterDifficulty(0.1)); }
        if(els.monsterDifficultyInput){
          const liveMonsterDifficultyUpdate = ()=>{
            const raw = parseFloat(els.monsterDifficultyInput.value);
            if(!Number.isFinite(raw)) return;
            const clamped = Math.max(0.1, Math.min(10, raw));
            const current = state.config.monsterScaling?.difficultyMultiplier ?? DEFAULT_MONSTER_SCALING.difficultyMultiplier;
            if(Math.abs(current - clamped) < 0.0001) return;
            state.config.monsterScaling = state.config.monsterScaling || { ...DEFAULT_MONSTER_SCALING };
            state.config.monsterScaling.difficultyMultiplier = clamped;
            updateDifficultyPreview();
            markProfileDirty();
            setMonsterDifficultyStatus('변경 내용을 적용하려면 "적용" 버튼을 눌러주세요.', 'warn');
          };
          const commitMonsterDifficulty = ()=>{
            let next = parseFloat(els.monsterDifficultyInput.value);
            if(!Number.isFinite(next)){ next = state.config.monsterScaling?.difficultyMultiplier ?? DEFAULT_MONSTER_SCALING.difficultyMultiplier; }
            next = Math.max(0.1, Math.min(10, Math.round(next * 100) / 100));
            els.monsterDifficultyInput.value = formatMultiplier(next);
            state.config.monsterScaling = state.config.monsterScaling || { ...DEFAULT_MONSTER_SCALING };
            state.config.monsterScaling.difficultyMultiplier = next;
            updateDifficultyPreview();
            markProfileDirty();
            return next;
          };
          if(els.monsterDifficultyApply){
            els.monsterDifficultyApply.addEventListener('click', async ()=>{
              if(els.monsterDifficultyApply.disabled) return;
              const applied = commitMonsterDifficulty();
              if(!Number.isFinite(applied)){
                setMonsterDifficultyStatus('유효한 난이도 배율을 입력하세요.', 'warn');
                return;
              }
              if(!isAdmin()){
                setMonsterDifficultyStatus(`몬스터 난이도 배율을 ${formatMultiplier(applied)}×로 적용했습니다.`, 'ok');
                setAdminMsg(`몬스터 난이도 배율을 ${formatMultiplier(applied)}×로 적용했습니다.`, 'ok');
                return;
              }
              els.monsterDifficultyApply.disabled = true;
              setMonsterDifficultyStatus('전역 설정에 적용 중...', 'warn');
              try {
                await persistGlobalConfig(state.config, { activePresetId: state.presets.activeGlobalId, activePresetName: state.presets.activeGlobalName });
                const msg = `몬스터 난이도 배율을 ${formatMultiplier(applied)}×로 적용했습니다.`;
                setMonsterDifficultyStatus(msg, 'ok');
                setAdminMsg(msg, 'ok');
              } catch (error) {
                console.error('몬스터 난이도 전역 적용 실패', error);
                setMonsterDifficultyStatus('몬스터 난이도 적용에 실패했습니다. 잠시 후 다시 시도하세요.', 'error');
                setAdminMsg('몬스터 난이도 적용에 실패했습니다. 잠시 후 다시 시도하세요.', 'error');
              } finally {
                els.monsterDifficultyApply.disabled = false;
              }
            });
          }
          els.monsterDifficultyInput.addEventListener('input', liveMonsterDifficultyUpdate);
          els.monsterDifficultyInput.addEventListener('change', commitMonsterDifficulty);
          els.monsterDifficultyInput.addEventListener('blur', commitMonsterDifficulty);
        }
        const draftDifficultyAdjustment = (key)=>{
          const input = key === 'easy' ? els.difficultyEasyInput : els.difficultyHardInput;
          if(!input) return;
          const value = parseFloat(input.value);
          if(!Number.isFinite(value)) return;
          const limits = key === 'easy' ? { min: -90, max: 0 } : { min: 0, max: 1000 };
          const clamped = Math.max(limits.min, Math.min(limits.max, value));
          const current = state.config.difficultyAdjustments || { ...DEFAULT_DIFFICULTY_ADJUSTMENTS };
          if(Math.abs((current[key] ?? 0) - clamped) < 0.0001) return;
          state.config.difficultyAdjustments = { ...current, [key]: clamped };
          updateDifficultyPreview();
          markProfileDirty();
          setMonsterDifficultyStatus('변경 내용을 적용하려면 "적용" 버튼을 눌러주세요.', 'warn');
        };
        const updateDifficultyAdjustment = (key)=>{
          const input = key === 'easy' ? els.difficultyEasyInput : els.difficultyHardInput;
          if(!input) return;
          const value = parseFloat(input.value);
          if(!Number.isFinite(value)){ return; }
          const current = state.config.difficultyAdjustments || { ...DEFAULT_DIFFICULTY_ADJUSTMENTS };
          const tentative = { ...current, [key]: value };
          const next = sanitizeDifficultyAdjustments(tentative);
          input.value = String(next[key]);
          if(current.easy === next.easy && current.hard === next.hard){
            updateDifficultyPreview();
            return;
          }
          state.config.difficultyAdjustments = next;
          updateDifficultyPreview();
          markProfileDirty();
          setMonsterDifficultyStatus('변경 내용을 적용하려면 "적용" 버튼을 눌러주세요.', 'warn');
        };
        if(els.difficultyEasyInput){
          els.difficultyEasyInput.addEventListener('input', ()=> draftDifficultyAdjustment('easy'));
          els.difficultyEasyInput.addEventListener('change', ()=> updateDifficultyAdjustment('easy'));
          els.difficultyEasyInput.addEventListener('blur', ()=> updateDifficultyAdjustment('easy'));
        }
        if(els.difficultyHardInput){
          els.difficultyHardInput.addEventListener('input', ()=> draftDifficultyAdjustment('hard'));
          els.difficultyHardInput.addEventListener('change', ()=> updateDifficultyAdjustment('hard'));
          els.difficultyHardInput.addEventListener('blur', ()=> updateDifficultyAdjustment('hard'));
        }
        // auto hunt
        if(els.autoHuntBtn){ els.autoHuntBtn.addEventListener('click', toggleAutoHunt); }
        // potion
        if(els.usePotion){ els.usePotion.addEventListener('click', usePotion); }
        if(els.useHyperPotion){ els.useHyperPotion.addEventListener('click', useHyperPotion); }
        if(els.claimRevive){ els.claimRevive.addEventListener('click', claimRevive); }
        if(els.shopPanel){ els.shopPanel.addEventListener('click', onShopClick); }
        if(els.battleResUse){ els.battleResUse.addEventListener('change', ()=>{ state.combat.useBattleRes = !!els.battleResUse.checked; state.combat.prefBattleRes = state.combat.useBattleRes; updateBattleResControls(); markProfileDirty(); }); }
        if(els.spareList){ els.spareList.addEventListener('click', onSpareListClick); }
        updateDifficultyPreview();
      }

      function toggleConfigDisabled(){
        const admin = isAdmin();
        const disabled = state.config.locked || (!admin && !state.ui.userEditEnabled);
        const fields = [
          els.mode,
          els.seed,
          els.pityEnabled,
          els.pityFloor,
          els.pitySpan,
          els.g10Enabled,
          els.g10Tier,
          els.adminMode,
          els.adminSeed,
          els.adminLock
        ];
        fields.forEach((field)=>{
          if(field){
            field.disabled = disabled;
          }
        });
        $$('.winput').forEach((input)=>{ input.disabled = disabled; });
        $$('.step-btn').forEach((btn)=>{ btn.disabled = disabled; });
        if(els.characterWeightsBody){
          els.characterWeightsBody.querySelectorAll('input[data-char-tier]').forEach((input)=>{ input.disabled = disabled; });
          els.characterWeightsBody.querySelectorAll('.step-btn').forEach((btn)=>{ btn.disabled = disabled; });
        }
        if(els.characterBalanceTable){
          els.characterBalanceTable.querySelectorAll('input[data-class][data-field]').forEach((input)=>{ input.disabled = disabled; });
        }
        if(els.characterBalanceOffsetTable){
          els.characterBalanceOffsetTable.querySelectorAll('input[data-class][data-field]').forEach((input)=>{ input.disabled = disabled; });
        }
        [
          els.potionDuration,
          els.potionManualCd,
          els.potionAutoCd,
          els.potionSpeedMult,
          els.hyperDuration,
          els.hyperManualCd,
          els.hyperAutoCd,
          els.hyperSpeedMult,
          els.monsterBasePower,
          els.monsterMaxPower,
          els.monsterCurve,
          els.monsterDifficultyInput,
          els.difficultyEasyInput,
          els.difficultyHardInput
        ].forEach((el)=>{
          if(el){
            el.disabled = disabled;
          }
        });
        if(els.monsterDifficultyMinus) els.monsterDifficultyMinus.disabled = disabled;
        if(els.monsterDifficultyPlus) els.monsterDifficultyPlus.disabled = disabled;
        if(els.globalPresetSelect) els.globalPresetSelect.disabled = admin ? false : state.ui.userEditEnabled;
        if(els.personalPresetSelect) els.personalPresetSelect.disabled = admin ? false : state.ui.userEditEnabled;
        updatePetWeightInputs();
        updateCharacterWeightsInputs();
        syncAdminConfigMirrors();
      }



      function syncAdminConfigMirrors(){
        if(els.adminMode && els.mode){
          els.adminMode.value = els.mode.value;
          els.adminMode.disabled = els.mode.disabled;
        }
        if(els.adminSeed && els.seed){
          els.adminSeed.value = els.seed.value;
          els.adminSeed.disabled = els.seed.disabled;
        }
        if(els.adminLock && els.lock){
          els.adminLock.checked = els.lock.checked;
          els.adminLock.disabled = els.lock.disabled;
        }
      }

      function announceRareDrop(kind, tier, itemName){
        if(!tier || !isAtLeast(tier, 'SS+')) return;
        const user = state.user;
        if(!user || !user.username) return;
        const label = (itemName || '').trim();
        if(!label) return;
        const payload = { kind, tier, item: label, username: user.username };
        const message = `${user.username}님이 ${tier} ${label}를 뽑는데 성공했습니다!`;
        sendSystemMessage(message, payload).catch((error)=>{
          console.warn('Rare drop chat broadcast failed', error);
        });
      }

      function sanitizeDrawPresets(raw){
        const defaults = DEFAULT_DRAW_PRESETS;
        const output = cloneDefaultDrawPresets();
        if(!raw || typeof raw !== 'object'){
          return output;
        }
        ['gear', 'character'].forEach((group)=>{
          const defaultsForGroup = defaults[group];
          const entries = Array.isArray(raw[group]) ? raw[group] : [];
          output[group] = defaultsForGroup.map((def)=>{
            const candidate = entries.find((item)=> item && item.id === def.id) || {};
            const label = typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : def.label;
            const costRaw = Number(candidate.totalCost);
            const totalCost = Number.isFinite(costRaw) && costRaw >= 0 ? Math.round(costRaw) : def.totalCost;
            const boostRaw = Number(candidate.boost);
            const boost = Number.isFinite(boostRaw) && boostRaw >= 0 ? Math.min(boostRaw, 5) : def.boost;
            const descriptor = typeof candidate.descriptor === 'string' ? candidate.descriptor.trim() : def.descriptor;
            return {
              id: def.id,
              label,
              count: def.count,
              totalCost,
              boost,
              descriptor
            };
          });
        });
        return output;
      }

      function ensureDrawPresetConfig(){
        state.config.drawPresets = sanitizeDrawPresets(state.config.drawPresets);
        return state.config.drawPresets;
      }

      function getGearPresets(){
        const config = ensureDrawPresetConfig();
        const presets = config.gear.map(p => ({ id: p.id, boost: p.boost, boostPercent: `${(p.boost * 100).toFixed(1)}%` }));
        console.log('🔍 [getGearPresets] 현재 저장된 설정:', presets);
        console.log('🔍 [getGearPresets] 프리미엄 뽑기 boost 값:', config.gear.find(p => p.id === 'drawPremium1')?.boost || '찾을 수 없음');
        return config.gear.map(clonePreset);
      }

      function getCharacterPresets(){
        const config = ensureDrawPresetConfig();
        const presets = config.character.map(p => ({ id: p.id, boost: p.boost, boostPercent: `${(p.boost * 100).toFixed(1)}%` }));
        console.log('🔍 [getCharacterPresets] 현재 저장된 설정:', presets);
        console.log('🔍 [getCharacterPresets] 프리미엄 뽑기 boost 값:', config.character.find(p => p.id === 'drawCharPremium1')?.boost || '찾을 수 없음');
        return config.character.map(clonePreset);
      }

      function getDrawPreset(group, id){
        const list = group === 'character' ? getCharacterPresets() : getGearPresets();
        const preset = list.find((item)=> item.id === id);
        return preset ? { ...preset } : null;
      }

      function formatBoostInputValue(boost){
        const percent = boost * 100;
        if(Number.isNaN(percent)) return '0';
        return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
      }

      function formatPresetNote(preset){
        const descriptor = (preset.descriptor || '').trim();
        if(descriptor) return descriptor;
        if(preset.boost > 0){
          const percent = preset.boost * 100;
          const display = Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1);
          return `S+↑ ${display}%p`;
        }
        return '기본 확률';
      }

      function formatPresetCost(preset){
        return `${formatNum(preset.totalCost)} 포인트`;
      }

      function applyPresetToButton(preset){
        const btn = els[preset.id];
        if(!btn) return;
        const labelNode = btn.querySelector('[data-preset-role="label"]');
        const costNode = btn.querySelector('[data-preset-role="cost"]');
        const noteNode = btn.querySelector('[data-preset-role="note"]');
        if(labelNode) labelNode.textContent = preset.label;
        if(costNode) costNode.textContent = formatPresetCost(preset);
        if(noteNode) noteNode.textContent = formatPresetNote(preset);
        const tooltip = `${preset.label} · ${formatPresetCost(preset)} · ${formatPresetNote(preset)}`;
        btn.title = tooltip;
      }

      function refreshDrawPresetButtonsUI(){
        const gearPresets = getGearPresets();
        const charPresets = getCharacterPresets();
        gearPresets.forEach(applyPresetToButton);
        charPresets.forEach(applyPresetToButton);
        // 뽑기 프리셋이 변경되었으므로 확률 테이블도 업데이트
        updateProbabilityTables();
      }

      function updateDrawPresetValue(group, id, field, value){
        ensureDrawPresetConfig();
        const config = state.config.drawPresets;
        const arr = config[group] || [];
        const index = arr.findIndex((preset)=> preset.id === id);
        if(index === -1) return;
        const next = { ...arr[index] };
        const linkedBoostMap = {
          drawBoost1: 'drawBoost10',
          drawBoost10: 'drawBoost1',
          drawPremium1: 'drawPremium10',
          drawPremium10: 'drawPremium1',
          drawCharBoost1: 'drawCharBoost10',
          drawCharBoost10: 'drawCharBoost1',
          drawCharPremium1: 'drawCharPremium10',
          drawCharPremium10: 'drawCharPremium1'
        };
        if(field === 'label'){
          next.label = typeof value === 'string' ? value : next.label;
        } else if(field === 'totalCost'){
          const num = Number(value);
          if(Number.isFinite(num)){
            next.totalCost = Math.max(0, Math.round(num));
          }
        } else if(field === 'boost'){
          const num = Number(value);
          if(Number.isFinite(num)){
            const newBoost = Math.max(0, Math.min(num / 100, 5));
            next.boost = newBoost;
            if(!next.descriptor || /^S\+\s*확률/.test(next.descriptor)){
              next.descriptor = '';
            }
          }
        } else if(field === 'descriptor'){
          next.descriptor = typeof value === 'string' ? value : next.descriptor;
        }
        arr[index] = next;
        if(field === 'boost'){
          const linkedId = linkedBoostMap[id];
          if(linkedId){
            const linkedIndex = arr.findIndex((preset)=> preset.id === linkedId);
            if(linkedIndex !== -1){
              const linkedPreset = { ...arr[linkedIndex], boost: next.boost };
              arr[linkedIndex] = linkedPreset;
            }
          }
        }
        state.config.drawPresets = sanitizeDrawPresets(config);
        markProfileDirty();
        refreshDrawPresetButtonsUI();
        updateDrawButtons();
        if(field === 'boost'){
          forceUpdateProbabilityTables();
          setTimeout(()=>{ forceUpdateProbabilityTables(); validateProbabilityTablesSync(group, id); }, 100);
          setTimeout(()=>{ forceUpdateProbabilityTables(); }, 300);
        } else {
          setTimeout(()=>{ updateProbabilityTables(); }, 100);
        }
        const skipField = (field === 'label' || field === 'descriptor') ? field : null;
        renderPresetRow(group, id, skipField ? { skipField } : {});
      }

      function resetDrawPreset(group, id){
        ensureDrawPresetConfig();
        const defaults = DEFAULT_DRAW_PRESETS[group];
        const def = defaults.find((preset)=> preset.id === id);
        if(!def) return;
        const config = state.config.drawPresets;
        const arr = config[group] || [];
        const index = arr.findIndex((preset)=> preset.id === id);
        if(index === -1) return;
        arr[index] = clonePreset(def);
        state.config.drawPresets = sanitizeDrawPresets(config);
        markProfileDirty();
        refreshDrawPresetButtonsUI();
        updateDrawButtons();
        renderPresetRow(group, id, {});
        setAdminMsg(`${def.label} 프리셋을 기본값으로 되돌렸습니다.`, 'ok');
      }

      function resetDrawPresetGroup(group){
        const defaults = cloneDefaultDrawPresets();
        ensureDrawPresetConfig();
        state.config.drawPresets[group] = defaults[group].map(clonePreset);
        state.config.drawPresets = sanitizeDrawPresets(state.config.drawPresets);
        markProfileDirty();
        refreshDrawPresetButtonsUI();
        updateDrawButtons();
        renderGachaPresetEditor();
        const groupLabel = group === 'character' ? '캐릭터' : '장비';
        setAdminMsg(`${groupLabel} 뽑기 프리셋을 기본값으로 초기화했습니다.`, 'ok');
      }

      function renderPresetRow(group, id, options){
        const row = document.querySelector(`tr[data-group="${group}"][data-id="${id}"]`);
        if(!row) return;
        const preset = getDrawPreset(group, id);
        if(!preset) return;
        if(options?.skipField !== 'label'){
          const labelInput = row.querySelector('input[data-field="label"]');
          if(labelInput) labelInput.value = preset.label;
        }
        if(options?.skipField !== 'totalCost'){
          const costInput = row.querySelector('input[data-field="totalCost"]');
          if(costInput) costInput.value = preset.totalCost;
        }
        if(options?.skipField !== 'boost'){
          const boostInput = row.querySelector('input[data-field="boost"]');
          if(boostInput) boostInput.value = formatBoostInputValue(preset.boost);
        }
        if(options?.skipField !== 'descriptor'){
          const descriptorInput = row.querySelector('input[data-field="descriptor"]');
          if(descriptorInput) descriptorInput.value = preset.descriptor || '';
        }
        const noteDisplay = row.querySelector('[data-display="note"]');
        if(noteDisplay) noteDisplay.textContent = formatPresetNote(preset);
      }

      function createPresetRow(group, preset){
        const tr = document.createElement('tr');
        tr.dataset.group = group;
        tr.dataset.id = preset.id;
        const countLabel = preset.count === 1 ? '1회' : `${preset.count}회`;
        tr.innerHTML = `
          <td>${countLabel}</td>
          <td><input type="text" data-field="label" value="${preset.label}" maxlength="60" /></td>
          <td><input type="text" data-field="totalCost" inputmode="numeric" pattern="[0-9]*" value="${preset.totalCost}" /></td>
          <td class="preset-boost-cell">
            <div class="input-group">
              <button type="button" class="step-btn step-minus" data-field="boost" data-delta="-1">-</button>
              <input type="text" data-field="boost" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" value="${formatBoostInputValue(preset.boost)}" style="width:60px" />
              <button type="button" class="step-btn step-plus" data-field="boost" data-delta="1">+</button>
            </div>
            <span style="font-size: 12px;">%</span>
          </td>
          <td><input type="text" data-field="descriptor" value="${preset.descriptor || ''}" placeholder="예: S+ 확률 +10%p" /></td>
          <td><span data-display="note">${formatPresetNote(preset)}</span></td>
          <td><button type="button" data-action="reset">기본값</button></td>
        `;
        return tr;
      }

      function renderGachaPresetEditor(){
        if(!els.gachaPresetGearBody || !els.gachaPresetCharacterBody) return;
        const gearBody = els.gachaPresetGearBody;
        gearBody.innerHTML = '';
        getGearPresets().forEach((preset)=>{
          gearBody.appendChild(createPresetRow('gear', preset));
        });
        const charBody = els.gachaPresetCharacterBody;
        charBody.innerHTML = '';
        getCharacterPresets().forEach((preset)=>{
          charBody.appendChild(createPresetRow('character', preset));
        });
      }

      function handleDrawPresetInput(event){
        const target = event.target;
        if(!(target instanceof HTMLInputElement)) return;
        const row = target.closest('tr[data-group][data-id]');
        if(!row) return;
        const group = row.dataset.group;
        const id = row.dataset.id;
        const field = target.dataset.field;
        if(!group || !id || !field) return;
        if(field === 'totalCost' || field === 'boost'){
          updateDrawPresetValue(group, id, field, target.value);
        } else if(field === 'label' || field === 'descriptor'){
          updateDrawPresetValue(group, id, field, target.value);
        }
      }

      function handleDrawPresetChange(event){
        const target = event.target;
        if(!(target instanceof HTMLInputElement)) return;
        const row = target.closest('tr[data-group][data-id]');
        if(!row) return;
        const group = row.dataset.group;
        const id = row.dataset.id;
        const field = target.dataset.field;
        if(!group || !id || !field) return;
        renderPresetRow(group, id, {});
        setAdminMsg('뽑기 프리셋을 저장했습니다.', 'ok');
      }

      function handleDrawPresetClick(event){
        const target = event.target;
        if(!(target instanceof HTMLElement)) return;
        const row = target.closest('tr[data-group][data-id]');
        if(!row) return;

        if(target.dataset.action === 'reset'){
          const group = row.dataset.group;
          const id = row.dataset.id;
          resetDrawPreset(group, id);
        }

        // +/- 버튼 처리
        if(target.classList.contains('step-btn') && target.dataset.field === 'boost'){
          const group = row.dataset.group;
          const id = row.dataset.id;
          const delta = parseFloat(target.dataset.delta);
          if(!group || !id || !isFinite(delta)) return;

          const input = row.querySelector('input[data-field="boost"]');
          if(!input) return;

          const currentVal = parseFloat(input.value.replace(',', '.')) || 0;
          const newVal = Math.max(0, currentVal + delta);
          input.value = newVal.toFixed(0);

          // 즉시 값 업데이트
          updateDrawPresetValue(group, id, 'boost', newVal);
        }
      }

      function withSPlusBoost(baseProbs, boost){
        const boostValue = Number(boost) || 0;
        if(!(boostValue > 0)) return null;
        const normalized = {};
        let baseTotal = 0;
        TIERS.forEach((tier)=>{
          const value = Number((baseProbs && baseProbs[tier]) ?? 0);
          normalized[tier] = value;
          baseTotal += value;
        });
        if(!(baseTotal > 0)){
          const share = 1 / TIERS.length;
          TIERS.forEach((tier)=>{ normalized[tier] = share; });
          baseTotal = 1;
        }
        TIERS.forEach((tier)=>{ normalized[tier] = (normalized[tier] || 0) / baseTotal; });
        const currentSPlus = SPLUS_TIERS.reduce((sum, tier)=> sum + (normalized[tier] || 0), 0);
        const targetSPlus = Math.min(0.999, currentSPlus + boostValue);
        if(targetSPlus <= currentSPlus + 1e-6){
          return { ...normalized };
        }
        const others = Math.max(0, 1 - currentSPlus);
        const targetOthers = Math.max(0, 1 - targetSPlus);
        const scaleSPlus = currentSPlus > 0 ? targetSPlus / currentSPlus : 0;
        const scaleOthers = others > 0 ? targetOthers / others : 0;
        const adjusted = {};
        if(currentSPlus > 0){
          SPLUS_TIERS.forEach((tier)=>{ adjusted[tier] = normalized[tier] * scaleSPlus; });
        } else {
          const perTier = targetSPlus / SPLUS_TIERS.length;
          SPLUS_TIERS.forEach((tier)=>{ adjusted[tier] = perTier; });
        }
        TIERS.forEach((tier)=>{
          if(SPLUS_TIERS.includes(tier)) return;
          const base = normalized[tier] || 0;
          adjusted[tier] = scaleOthers > 0 ? base * scaleOthers : 0;
        });
        const sum = TIERS.reduce((acc, tier)=> acc + (adjusted[tier] || 0), 0);
        if(Math.abs(sum - 1) > 1e-6){
          const diff = 1 - sum;
          const lastTier = TIERS[TIERS.length - 1];
          adjusted[lastTier] = (adjusted[lastTier] || 0) + diff;
        }
        return adjusted;
      }

      // 확률 표시 관련 함수들
      function calculateDrawProbabilities(baseProbs, boostAmount = 0) {
        const boost = Number(boostAmount) || 0;
        console.log(`⚡ [calculateDrawProbabilities] 입력 - boost: ${boost * 100}%, 기본확률:`, baseProbs);

        if (boost <= 0) {
          console.log(`⚡ [calculateDrawProbabilities] boost가 0 이하이므로 기본 확률 반환`);
          return { ...baseProbs };
        }

        // 🔥 중요: withSPlusBoost와 완전히 동일한 로직 사용
        const result = withSPlusBoost(baseProbs, boost);
        console.log(`⚡ [calculateDrawProbabilities] 최종 결과 - boost ${(boostAmount * 100).toFixed(1)}% 적용:`, result);

        // 🔍 S+ 합계 확인
        const splusSum = (result?.['SSS+'] || 0) + (result?.['SS+'] || 0) + (result?.['S+'] || 0);
        const baseSplusSum = (baseProbs?.['SSS+'] || 0) + (baseProbs?.['SS+'] || 0) + (baseProbs?.['S+'] || 0);
        console.log(`⚡ S+ 합계 변화: ${(baseSplusSum * 100).toFixed(3)}% → ${(splusSum * 100).toFixed(3)}%`);

        return result || { ...baseProbs };
      }

      // 🔍 디버깅 함수 - 브라우저 콘솔에서 직접 호출 가능
      window.debugProbabilities = function() {
        console.log('🔍🔍🔍 === 확률 시스템 디버깅 === 🔍🔍🔍');

        const gearPresets = getGearPresets();
        const charPresets = getCharacterPresets();

        console.log('📋 현재 장비 프리셋:', gearPresets.map(p => ({
          id: p.id,
          label: p.label,
          boost: p.boost,
          boostPercent: `${p.boost * 100}%`
        })));

        console.log('📋 현재 캐릭터 프리셋:', charPresets.map(p => ({
          id: p.id,
          label: p.label,
          boost: p.boost,
          boostPercent: `${p.boost * 100}%`
        })));

        console.log('🎯 기본 장비 확률:', state.config.probs);
        console.log('🎯 기본 캐릭터 확률:', state.config.characterProbs);

        // 실제 계산 테스트
        const premiumGear = gearPresets.find(p => p.id === 'drawPremium1');
        if (premiumGear) {
          console.log(`🧪 프리미엄 장비 뽑기 (${premiumGear.boost * 100}%) 계산 테스트:`);
          const result = calculateDrawProbabilities(state.config.probs, premiumGear.boost);
          console.log('📊 결과:', result);
        }

        console.log('🔍🔍🔍 === 디버깅 완료 === 🔍🔍🔍');
      };

      // 🔧 강제 설정 함수 - 브라우저 콘솔에서 직접 호출 가능
      window.forceSetBoost = function(boostValue = 200) {
        console.log(`🔧 강제로 프리미엄 뽑기 boost를 ${boostValue}%로 설정`);

        // 직접 state 수정
        const gearConfig = state.config.drawPresets.gear;
        const premiumGear = gearConfig.find(p => p.id === 'drawPremium1');
        if (premiumGear) {
          premiumGear.boost = boostValue / 100;
          console.log('✅ 장비 프리미엄 boost 설정 완료:', premiumGear.boost);
        }

        const charConfig = state.config.drawPresets.character;
        const premiumChar = charConfig.find(p => p.id === 'drawCharPremium1');
        if (premiumChar) {
          premiumChar.boost = boostValue / 100;
          console.log('✅ 캐릭터 프리미엄 boost 설정 완료:', premiumChar.boost);
        }

        // 즉시 업데이트
        refreshDrawPresetButtonsUI();
        updateProbabilityTables();
        markProfileDirty();

        console.log('✅ 강제 설정 완료 - 확률 탭을 확인해보세요!');
      };

      // 실시간 확률 동기화 검증 도구
      window.validateDrawProbabilities = function() {
        console.log('🔍 === 실시간 확률 동기화 검증 시작 ===');

        try {
          const gearPresets = getGearPresets();
          const charPresets = getCharacterPresets();

          const results = {
            gear: {},
            character: {}
          };

          // 장비 뽑기 확률 검증
          ['drawBasic1', 'drawBoost1', 'drawPremium1'].forEach(id => {
            const preset = gearPresets.find(p => p.id === id);
            if (preset) {
              const actualDrawProbs = preset.boost > 0
                ? withSPlusBoost(state.config.probs, preset.boost)
                : state.config.probs;

              results.gear[id] = {
                preset: preset,
                actualDrawProbs: actualDrawProbs,
                displayedProbs: calculateDrawProbabilities(state.config.probs, preset.boost)
              };
            }
          });

          // 캐릭터 뽑기 확률 검증
          ['drawCharBasic1', 'drawCharBoost1', 'drawCharPremium1'].forEach(id => {
            const preset = charPresets.find(p => p.id === id);
            if (preset) {
              const baseCharProbs = state.config.characterProbs || {};
              const actualDrawProbs = preset.boost > 0
                ? withSPlusBoost(baseCharProbs, preset.boost)
                : baseCharProbs;

              results.character[id] = {
                preset: preset,
                actualDrawProbs: actualDrawProbs,
                displayedProbs: calculateDrawProbabilities(baseCharProbs, preset.boost)
              };
            }
          });

          console.log('📊 검증 결과:', results);

          // 불일치 검증
          let hasDiscrepancy = false;

          Object.entries(results.gear).forEach(([id, data]) => {
            const actualSPlus = (data.actualDrawProbs['SSS+'] || 0) + (data.actualDrawProbs['SS+'] || 0) + (data.actualDrawProbs['S+'] || 0);
            const displaySPlus = (data.displayedProbs['SSS+'] || 0) + (data.displayedProbs['SS+'] || 0) + (data.displayedProbs['S+'] || 0);

            if (Math.abs(actualSPlus - displaySPlus) > 0.0001) {
              console.warn(`⚠️ 불일치 발견 - ${id}: 실제=${(actualSPlus*100).toFixed(3)}% vs 표시=${(displaySPlus*100).toFixed(3)}%`);
              hasDiscrepancy = true;
            }
          });

          if (!hasDiscrepancy) {
            console.log('✅ 모든 확률이 정확히 동기화되어 있습니다!');
            showSyncValidationMessage('확률 동기화 검증 완료 - 모든 값이 일치합니다');
          } else {
            console.warn('⚠️ 확률 불일치가 발견되었습니다. 강제 업데이트를 실행합니다.');
            forceUpdateProbabilityTables();
          }

          return results;

        } catch (error) {
          console.error('❌ 확률 검증 중 오류:', error);
          return null;
        }
      };

      // 🧪 boost 계산 테스트 함수
      window.testBoostCalculation = function(testBoost = 0.25) {
        console.log('🧪 === boost 계산 테스트 시작 ===');
        console.log(`테스트 boost 값: ${testBoost} (${testBoost * 100}%)`);

        const baseProbs = state.config.probs;
        console.log('기본 확률:', baseProbs);

        const baseSPlus = (baseProbs['SSS+'] || 0) + (baseProbs['SS+'] || 0) + (baseProbs['S+'] || 0);
        console.log(`기본 S+ 합계: ${(baseSPlus * 100).toFixed(3)}%`);

        // withSPlusBoost 테스트
        const boostedProbs = withSPlusBoost(baseProbs, testBoost);
        console.log('withSPlusBoost 결과:', boostedProbs);

        if (boostedProbs) {
          const boostedSPlus = (boostedProbs['SSS+'] || 0) + (boostedProbs['SS+'] || 0) + (boostedProbs['S+'] || 0);
          console.log(`boost 적용 후 S+ 합계: ${(boostedSPlus * 100).toFixed(3)}%`);
          console.log(`증가율: ${((boostedSPlus / baseSPlus - 1) * 100).toFixed(1)}%`);
        } else {
          console.warn('⚠️ withSPlusBoost가 null을 반환했습니다!');
        }

        // calculateDrawProbabilities 테스트
        const calcResult = calculateDrawProbabilities(baseProbs, testBoost);
        console.log('calculateDrawProbabilities 결과:', calcResult);

        const calcSPlus = (calcResult['SSS+'] || 0) + (calcResult['SS+'] || 0) + (calcResult['S+'] || 0);
        console.log(`계산 함수 결과 S+ 합계: ${(calcSPlus * 100).toFixed(3)}%`);

        console.log('🧪 === boost 계산 테스트 완료 ===');
        return {
          baseProbs,
          baseSPlus,
          boostedProbs,
          calcResult,
          testBoost
        };
      };

      // 관리자용 실시간 확률 모니터링
      window.startProbabilityMonitoring = function() {
        if (window.probabilityMonitorInterval) {
          clearInterval(window.probabilityMonitorInterval);
        }

        console.log('👁️ 실시간 확률 모니터링 시작 (5초마다 검증)');

        window.probabilityMonitorInterval = setInterval(() => {
          if (isAdmin()) {
            const results = window.validateDrawProbabilities();
            if (results) {
              console.log('🔄 자동 확률 검증 완료');
            }
          }
        }, 5000);
      };

      window.stopProbabilityMonitoring = function() {
        if (window.probabilityMonitorInterval) {
          clearInterval(window.probabilityMonitorInterval);
          window.probabilityMonitorInterval = null;
          console.log('⏹️ 실시간 확률 모니터링 중지');
        }
      };

      console.log('🔍🔍🔍 === 디버깅 완료 === 🔍🔍🔍');

      function buildProbabilityTable(type = 'gear', forceMode = false) {
        const isGear = type === 'gear';
        const tableBodies = (isGear
          ? [els.gearProbabilityBody, els.adminGearProbabilityBody]
          : [els.characterProbabilityBody, els.adminCharacterProbabilityBody]
        ).filter(Boolean);
        if (!tableBodies.length) return;

        const baseProbs = isGear ? state.config.probs : (state.config.characterProbs || {});

        // 실제 관리자가 설정한 뽑기 프리셋에서 boost 값 가져오기
        const presets = isGear ? getGearPresets() : getCharacterPresets();

        if (forceMode) {
          console.log(`🔥 [buildProbabilityTable] ${type} 강제 모드 - 최신 프리셋 강제 로드`);
        }

        console.log(`🔍 [buildProbabilityTable] ${type} 프리셋 목록:`, presets.map(p => ({
          id: p.id,
          boost: p.boost,
          boostPercent: `${(p.boost * 100).toFixed(1)}%`,
          label: p.label
        })));

        const basicPreset = presets.find(p => p.id === 'drawBasic1' || p.id === 'drawCharBasic1') || { boost: 0 };
        const boostPreset = presets.find(p => p.id === 'drawBoost1' || p.id === 'drawCharBoost1') || { boost: 0.10 };
        const premiumPreset = presets.find(p => p.id === 'drawPremium1' || p.id === 'drawCharPremium1') || { boost: 0.25 };

        console.log(`🎯 [buildProbabilityTable] ${type} 찾은 프리셋들:`, {
          basic: { id: basicPreset.id, boost: basicPreset.boost, boostPercent: `${(basicPreset.boost * 100).toFixed(1)}%` },
          boost: { id: boostPreset.id, boost: boostPreset.boost, boostPercent: `${(boostPreset.boost * 100).toFixed(1)}%` },
          premium: { id: premiumPreset.id, boost: premiumPreset.boost, boostPercent: `${(premiumPreset.boost * 100).toFixed(1)}%` }
        });

        // 🔥 중요: 실제 state에서 다시 한 번 확인
        if (forceMode) {
          console.log(`🔥 [buildProbabilityTable] ${type} state.config.drawPresets에서 강제 재확인:`);
          const configPresets = isGear ? state.config.drawPresets.gear : state.config.drawPresets.character;
          configPresets.forEach(p => {
            if (p.id.includes('Premium') || p.id.includes('Boost') || p.id.includes('Basic')) {
              console.log(`  - ${p.id}: boost=${p.boost} (${(p.boost * 100).toFixed(1)}%)`);
            }
          });
        }

        const basicProbs = calculateDrawProbabilities(baseProbs, basicPreset.boost);
        const boostProbs = calculateDrawProbabilities(baseProbs, boostPreset.boost);
        const premiumProbs = calculateDrawProbabilities(baseProbs, premiumPreset.boost);

        // 🔍 기본 S+ 확률 계산
        const splusTiers = ['SSS+', 'SS+', 'S+'];
        const baseSPlusTotal = splusTiers.reduce((sum, tier) => sum + (baseProbs[tier] || 0), 0);
        console.log(`🎯 [buildProbabilityTable] ${type} 기본 S+ 합계 확률: ${(baseSPlusTotal * 100).toFixed(3)}%`, {
          'SSS+': (baseProbs['SSS+'] * 100).toFixed(3) + '%',
          'SS+': (baseProbs['SS+'] * 100).toFixed(3) + '%',
          'S+': (baseProbs['S+'] * 100).toFixed(3) + '%'
        });

        const rowData = TIERS.map(tier => {
          const basicPct = formatPct(basicProbs[tier] || 0);
          const boostPct = formatPct(boostProbs[tier] || 0);
          const premiumPct = formatPct(premiumProbs[tier] || 0);

          if (tier === 'SSS+' || tier === 'SS+' || tier === 'S+') {
            console.log(`🧮 [${type}] ${tier} 계산:`, {
              기본: `${(basicProbs[tier] * 100).toFixed(4)}% (${basicPct})`,
              확률업: `${(boostProbs[tier] * 100).toFixed(4)}% (${boostPct})`,
              프리미엄: `${(premiumProbs[tier] * 100).toFixed(4)}% (${premiumPct})`
            });
          }

          const isBoosted = SPLUS_TIERS.includes(tier);
          const boostClass = (isBoosted && boostPreset.boost > 0) ? ' tier-boosted' : '';
          const premiumClass = (isBoosted && premiumPreset.boost > 0) ? ' tier-boosted' : '';

          return {
            tier,
            basicPct,
            boostPct,
            premiumPct,
            boostClass,
            premiumClass
          };
        });

        tableBodies.forEach(body => {
          body.innerHTML = '';
          rowData.forEach(({ tier, basicPct, boostPct, premiumPct, boostClass, premiumClass }) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td class="tier ${tier}">${tier}</td>
            <td class="prob-basic">${basicPct}</td>
            <td class="prob-boost${boostClass}">${boostPct}</td>
            <td class="prob-premium${premiumClass}">${premiumPct}</td>
          `;
            body.appendChild(tr);
          });
        });
      }

      function updateProbabilityTables() {
        buildProbabilityTable('gear');
        buildProbabilityTable('character');
        updateDrawButtonTooltips();
        showProbabilityUpdateNotification();
      }

      function forceUpdateProbabilityTables() {
        console.log('🔥 [forceUpdateProbabilityTables] 강제 업데이트 시작');

        // 캐시 무시하고 강제로 프리셋 다시 로드
        const timestamp = Date.now();
        console.log(`⏰ 강제 업데이트 타임스탬프: ${timestamp}`);

        // 테이블 재구성 (강제 모드)
        buildProbabilityTable('gear', true);
        buildProbabilityTable('character', true);

        // 툴팁도 강제 업데이트
        updateDrawButtonTooltips();

        // 시각적 피드백
        showProbabilityUpdateNotification();

        console.log('🔥 [forceUpdateProbabilityTables] 강제 업데이트 완료');
      }

      function validateProbabilityTablesSync(group, changedId) {
        console.log(`🔍 [validateProbabilityTablesSync] 동기화 검증 시작: ${group} ${changedId}`);

        try {
          // 실제 설정값 가져오기
          const presets = group === 'gear' ? getGearPresets() : getCharacterPresets();
          const changedPreset = presets.find(p => p.id === changedId);

          if (!changedPreset) {
            console.warn(`⚠️ 변경된 프리셋을 찾을 수 없음: ${changedId}`);
            return false;
          }

          // 화면의 확률 테이블에서 해당 프리셋의 boost가 제대로 반영되었는지 확인
          const tableBody = group === 'gear'
            ? document.querySelector('#gearProbabilityBody')
            : document.querySelector('#characterProbabilityBody');

          if (!tableBody) {
            console.warn(`⚠️ 확률 테이블을 찾을 수 없음: ${group}`);
            return false;
          }

          console.log(`✅ 동기화 검증 성공: ${group} ${changedId} boost=${(changedPreset.boost * 100).toFixed(1)}%`);

          // 관리자용 알림 표시
          if (isAdmin()) {
            showSyncValidationMessage(`${group} 확률이 성공적으로 업데이트되었습니다.`);
          }

          return true;
        } catch (error) {
          console.error('❌ 동기화 검증 중 오류:', error);
          return false;
        }
      }

      function showProbabilityUpdateNotification() {
        if (!els.probabilityUpdateStatus || !isAdmin()) return;

        // 업데이트 알림 표시
        els.probabilityUpdateStatus.style.display = 'block';
        els.probabilityUpdateStatus.textContent = '✨ 확률 정보가 업데이트되었습니다';

        // 3초 후 자동으로 숨김
        setTimeout(() => {
          if (els.probabilityUpdateStatus) {
            els.probabilityUpdateStatus.style.display = 'none';
          }
        }, 3000);
      }

      function showSyncValidationMessage(message) {
        if (!isAdmin()) return;

        // 동기화 검증 메시지 표시
        if (els.probabilityUpdateStatus) {
          els.probabilityUpdateStatus.style.display = 'block';
          els.probabilityUpdateStatus.textContent = `✅ ${message}`;
          els.probabilityUpdateStatus.style.backgroundColor = '#d4edda';
          els.probabilityUpdateStatus.style.color = '#155724';

          // 2초 후 자동으로 숨김
          setTimeout(() => {
            if (els.probabilityUpdateStatus) {
              els.probabilityUpdateStatus.style.display = 'none';
              els.probabilityUpdateStatus.style.backgroundColor = '';
              els.probabilityUpdateStatus.style.color = '';
            }
          }, 2000);
        } else {
          // fallback으로 콘솔에 출력
          console.log(`✅ ${message}`);
        }
      }

      function handleProbabilityDisplayModeChange(mode) {
        const gearWraps = [els.gearProbabilityWrap, els.adminGearProbabilityWrap].filter(Boolean);
        const characterWraps = [els.characterProbabilityWrap, els.adminCharacterProbabilityWrap].filter(Boolean);
        if (!gearWraps.length && !characterWraps.length) return;

        [els.probDisplayModeGear, els.adminProbDisplayModeGear].forEach((btn)=>{
          if(btn){
            btn.classList.toggle('active', mode === 'gear');
          }
        });
        [els.probDisplayModeCharacter, els.adminProbDisplayModeCharacter].forEach((btn)=>{
          if(btn){
            btn.classList.toggle('active', mode === 'character');
          }
        });

        gearWraps.forEach((wrap)=>{
          wrap.style.display = mode === 'gear' ? '' : 'none';
        });
        characterWraps.forEach((wrap)=>{
          wrap.style.display = mode === 'character' ? '' : 'none';
        });
      }

      function updateDrawButtonTooltips() {
        // 장비 뽑기 버튼 툴팁
        const gearProbs = state.config.probs;
        if (gearProbs) {
          // 실제 관리자가 설정한 뽑기 프리셋에서 boost 값 가져오기
          const gearPresets = getGearPresets();
          const basicGearPreset = gearPresets.find(p => p.id.includes('Basic1')) || { boost: 0 };
          const boostGearPreset = gearPresets.find(p => p.id.includes('Boost1')) || { boost: 0.10 };
          const premiumGearPreset = gearPresets.find(p => p.id.includes('Premium1')) || { boost: 0.25 };

          const basicGearProbs = calculateDrawProbabilities(gearProbs, basicGearPreset.boost);
          const boostGearProbs = calculateDrawProbabilities(gearProbs, boostGearPreset.boost);
          const premiumGearProbs = calculateDrawProbabilities(gearProbs, premiumGearPreset.boost);

          const splusTiers = ['SSS+', 'SS+', 'S+'];
          const basicSPlus = splusTiers.reduce((sum, tier) => sum + (basicGearProbs[tier] || 0), 0);
          const boostSPlus = splusTiers.reduce((sum, tier) => sum + (boostGearProbs[tier] || 0), 0);
          const premiumSPlus = splusTiers.reduce((sum, tier) => sum + (premiumGearProbs[tier] || 0), 0);

          // 기본 뽑기
          if (els.drawBasic1) {
            els.drawBasic1.title = `기본 확률로 한 번 뽑습니다.\nS+ 이상: ${formatPct(basicSPlus)}`;
          }
          if (els.drawBasic10) {
            els.drawBasic10.title = `10% 할인된 가격으로 10회 뽑습니다.\nS+ 이상: ${formatPct(basicSPlus)}`;
          }

          // 확률업 뽑기
          if (els.drawBoost1) {
            els.drawBoost1.title = `S+ 이상 확률이 10%p 상승합니다.\nS+ 이상: ${formatPct(basicSPlus)} → ${formatPct(boostSPlus)}`;
          }
          if (els.drawBoost10) {
            els.drawBoost10.title = `10회 모두 S+ 이상 확률이 10%p 상승합니다.\nS+ 이상: ${formatPct(basicSPlus)} → ${formatPct(boostSPlus)}`;
          }

          // 프리미엄 뽑기
          if (els.drawPremium1) {
            els.drawPremium1.title = `S+ 이상 확률이 25%p 상승합니다.\nS+ 이상: ${formatPct(basicSPlus)} → ${formatPct(premiumSPlus)}`;
          }
          if (els.drawPremium10) {
            els.drawPremium10.title = `10회 모두 S+ 이상 확률이 25%p 상승합니다.\nS+ 이상: ${formatPct(basicSPlus)} → ${formatPct(premiumSPlus)}`;
          }
        }

        // 캐릭터 뽑기 버튼 툴팁
        const charProbs = state.config.characterProbs;
        if (charProbs) {
          // 실제 관리자가 설정한 캐릭터 뽑기 프리셋에서 boost 값 가져오기
          const charPresets = getCharacterPresets();
          const basicCharPreset = charPresets.find(p => p.id.includes('Basic1')) || { boost: 0 };
          const boostCharPreset = charPresets.find(p => p.id.includes('Boost1')) || { boost: 0.10 };
          const premiumCharPreset = charPresets.find(p => p.id.includes('Premium1')) || { boost: 0.25 };

          const basicCharProbs = calculateDrawProbabilities(charProbs, basicCharPreset.boost);
          const boostCharProbs = calculateDrawProbabilities(charProbs, boostCharPreset.boost);
          const premiumCharProbs = calculateDrawProbabilities(charProbs, premiumCharPreset.boost);

          const splusTiers = ['SSS+', 'SS+', 'S+'];
          const basicCharSPlus = splusTiers.reduce((sum, tier) => sum + (basicCharProbs[tier] || 0), 0);
          const boostCharSPlus = splusTiers.reduce((sum, tier) => sum + (boostCharProbs[tier] || 0), 0);
          const premiumCharSPlus = splusTiers.reduce((sum, tier) => sum + (premiumCharProbs[tier] || 0), 0);

          // 기본 캐릭터 뽑기
          if (els.drawCharBasic1) {
            els.drawCharBasic1.title = `기본 확률로 캐릭터 한 명을 뽑습니다.\nS+ 이상: ${formatPct(basicCharSPlus)}`;
          }
          if (els.drawCharBasic10) {
            els.drawCharBasic10.title = `10% 할인된 가격으로 캐릭터 10회를 뽑습니다.\nS+ 이상: ${formatPct(basicCharSPlus)}`;
          }

          // 확률업 캐릭터 뽑기
          if (els.drawCharBoost1) {
            els.drawCharBoost1.title = `S+ 이상 캐릭터 확률이 10%p 상승합니다.\nS+ 이상: ${formatPct(basicCharSPlus)} → ${formatPct(boostCharSPlus)}`;
          }
          if (els.drawCharBoost10) {
            els.drawCharBoost10.title = `10회 모두 S+ 이상 캐릭터 확률이 10%p 상승합니다.\nS+ 이상: ${formatPct(basicCharSPlus)} → ${formatPct(boostCharSPlus)}`;
          }

          // 프리미엄 캐릭터 뽑기
          if (els.drawCharPremium1) {
            els.drawCharPremium1.title = `S+ 이상 캐릭터 확률이 25%p 상승합니다.\nS+ 이상: ${formatPct(basicCharSPlus)} → ${formatPct(premiumCharSPlus)}`;
          }
          if (els.drawCharPremium10) {
            els.drawCharPremium10.title = `10회 모두 S+ 이상 캐릭터 확률이 25%p 상승합니다.\nS+ 이상: ${formatPct(basicCharSPlus)} → ${formatPct(premiumCharSPlus)}`;
          }
        }
      }

      function applyPityCounter(tier){ const floor = state.config.pity.floorTier; if(isAtLeast(tier, floor)){ state.pitySince = 0; } else { state.pitySince++; } }
      function activeDrawProbs(){ return state.drawSessionProbs || state.config.probs; }
      function drawOneWithPity(rng){ const {pity} = state.config; const probs = activeDrawProbs(); const floor = pity.floorTier; if(pity.enabled && state.pitySince >= pity.span-1){ const allowed = TIERS.filter(t=> isAtLeast(t, floor)); const t = rescaledPick(allowed, probs, rng); state.pitySince = 0; return t; } const t = chooseTier(probs, rng); applyPityCounter(t); return t; }
      function baseCharacterProbs(){
        const probs = state.config.characterProbs || {};
        if(Object.values(probs).some((v)=> Number(v) > 0)){
          return probs;
        }
        return state.config.probs;
      }
      function activeCharacterProbs(){ return state.characterDrawProbs || baseCharacterProbs(); }

      async function runDraws(preset){
        console.log('🎲 원래 runDraws 함수 호출됨:', preset);
        if(!preset || typeof preset !== 'object') return;
        if((state.ui.gachaMode || 'gear') !== 'gear'){ updateGachaModeView('gear'); }
        const { count, totalCost, boost = 0, label = '뽑기', descriptor } = preset;
        const n = Math.max(1, Number(count) || 1);
        const cost = Math.max(0, Number(totalCost) || 0);
        if(!isAdmin() && !canSpend(cost)){ setDrawMessage(`포인트가 부족합니다. (필요: ${formatNum(cost)} 포인트)`, 'warn'); updateDrawButtons(); return; }
        if(!isAdmin() && !spendPoints(cost)){ setDrawMessage(`포인트가 부족합니다. (필요: ${formatNum(cost)} 포인트)`, 'warn'); updateDrawButtons(); return; }
        if(isAdmin()) updatePointsView();
        const boostText = boost > 0 ? ` (S+ 확률 +${Math.round(boost * 100)}%p)` : '';
        setDrawMessage(`${label} 진행 중...${boostText}`, 'warn');
        const previousOverride = state.drawSessionProbs;
        state.drawSessionProbs = boost > 0 ? withSPlusBoost(state.config.probs, boost) : null;
        const rng = getRng();
        state.inRun = true;
        state.cancelFlag = false;
        if(els.cancel) els.cancel.disabled = false;
        updateDrawButtons();
        const speed = parseInt(els.speed?.value || '0', 10);
        let results = [];
        const shouldRender = (n === 1 || n === 10);
        const collected = [];
        const collectFn = shouldRender ? function(payload){
          if(!payload) return;
          const partName = getPartNameByKey(payload.part) || '';
          const icon = iconForPart(payload.part);
          collected.push({
            type: 'gear',
            tier: payload.tier,
            part: payload.part,
            icon: icon,
            partName,
            item: payload.item || null
          });
        } : null;
        const batch = n >= 200; const updateEvery = n>=10000? 200 : n>=1000? 50 : n>=200? 10 : 1;
        const cfgHash = await sha256Hex(JSON.stringify(compactConfig()));
        const runId = state.runId++;
        const processDraw = async (tier, index)=>{
          results.push(tier);
          await applyResult(tier, runId, cfgHash, {deferUI: batch, skipLog: batch, rng, onCollect: collectFn});
          if(batch && ((index+1)%updateEvery===0)) { syncStats(); drawChart(); const h = latestHistory(); if(h) appendLog(h); }
          await maybeDelay(speed);
          updateProgress(results.length, n);
        };
        if(n === 10 && state.config.minGuarantee10.enabled){
          for(let i=0;i<9;i++){
            if(state.cancelFlag) break;
            const tier = drawOneWithPity(rng);
            await processDraw(tier, i);
          }
          if(!state.cancelFlag){
            const floor = state.config.minGuarantee10.tier;
            const satisfied = results.some((tier)=> isAtLeast(tier, floor));
            if(!satisfied){
              const allowed = TIERS.filter((tier)=> isAtLeast(tier, floor));
              const forced = rescaledPick(allowed, activeDrawProbs(), rng);
              await processDraw(forced, 9);
            } else {
              const tier = drawOneWithPity(rng);
              await processDraw(tier, 9);
            }
          }
        } else {
          for(let i=0;i<n;i++){
            if(state.cancelFlag) break;
            const tier = drawOneWithPity(rng);
            await processDraw(tier, i);
          }
        }
        if(batch){ syncStats(); drawChart(); updateInventoryView(); const h = latestHistory(); if(h) appendLog(h); }
        if(els.cancel) els.cancel.disabled = true;
        state.inRun = false;
        updateDrawButtons();
        updateProgress(0, 100);
        if(shouldRender){
          // 슬롯머신이 실행 중이면 결과를 슬롯머신에 전달
          if(slotMachineState.isRunning) {
            const tiers = results; // results 배열에 tier 정보가 들어있음
            console.log('🎰 슬롯머신에 전달할 실제 뽑기 결과:', tiers);
            console.log('🎯 collected 데이터:', collected);

            // 슬롯머신 상태에 collected 데이터 저장 (나중에 triggerOriginalDraw에서 사용)
            slotMachineState.collectedData = collected;
            slotMachineState.drawCount = n;
            console.log('🎯 슬롯머신에 저장된 데이터:', { collected, tiers, n });

            try {
              if(n === 1) {
                console.log('1회 뽑기 슬롯머신 실행:', tiers[0]);
                await runSingleSlotAnimationWithResult(tiers[0]);
              } else {
                console.log('10회 뽑기 슬롯머신 실행:', tiers);
                await runMultiSlotAnimationWithResults(tiers);
              }
              console.log('슬롯머신 애니메이션 완료');
            } catch (error) {
              console.error('슬롯머신 애니메이션 오류:', error);
            }

            // 슬롯머신이 실행 중일 때도 일단 결과 표시 (임시)
            renderDrawResults(collected, n);
          } else {
            // 슬롯머신이 실행되지 않을 때만 바로 결과 표시
            renderDrawResults(collected, n);
          }
        } else {
          renderDrawResults([], 0);
        }
        if(state.cancelFlag){
          setDrawMessage('뽑기를 중단했습니다. 이미 획득한 결과만 적용되었습니다.', 'warn');
          state.cancelFlag = false;
        } else {
          const descriptorText = descriptor ? `${descriptor} · ` : '';
          setDrawMessage(`${label} 완료! ${descriptorText}총 ${n}회 결과를 확인하세요.`, 'ok');
        }
        state.drawSessionProbs = previousOverride;
        markProfileDirty();
      }

      async function applyResult(tier, runId, cfgHash, opts){ opts = opts||{}; const rng = opts.rng || getRng(); state.session.draws++; state.session.counts[tier]++; const now=Date.now(); const id = state.session.history.length + 1; const part = choosePart(rng); const stat = rollStatFor(tier, part, rng); const rec = {id, tier, ts: now, runId, cfgHash, part, stat}; state.session.history.push(rec);
        const partDef = PART_DEFS.find((entry) => entry.key === part);
        const item = { id: state.itemSeq++, tier, part, base: stat, lvl: 0, type: partDef?.type || 'atk' };
        item.__animationPlayed = false;
        if(typeof opts.onCollect === 'function'){ opts.onCollect({ tier, part, item }); }
        let decision = opts.decision || null;
        if(!opts.skipPrompt && isLegendaryGearTier(tier)){
          if(!opts.deferUI){
            try {
              await playLegendaryGearAnimation(tier, part);
              item.__animationPlayed = true;
            } catch (error) {
              console.warn('전설 장비 이펙트 실행 실패', error);
            }
          }
          const current = state.equip[part] || null;
          const comparison = buildGearComparison(item, current);
          decision = await showGearLegendaryOverlay(comparison, current);
        }
        applyEquipAndInventory(item, { decision });
        if(isLegendaryGearTier(tier)){
          const partName = getPartNameByKey(part) || part || '장비';
          announceRareDrop('gear', tier, partName);
        }
        // global
        state.global.draws++; state.global.counts[tier]++; saveGlobal(); if(!opts.skipLog) appendLog(rec); if(!opts.deferUI){ syncStats(); drawChart(); updateInventoryView(); }
        return item;
      }

      function latestHistory(){ const h = state.session.history; return h.length? h[h.length-1] : null; }

      function updateProgress(now, total){ const p = total? Math.max(0, Math.min(100, (now/total)*100)) : 0; els.bar.style.width = p.toFixed(1)+'%'; }
      function maybeDelay(ms){ return new Promise(r=> setTimeout(r, ms)); }

      // Stats and chart
      function activeStats(){ return els.scope.value==='global' ? state.global : state.session; }
      function syncStats(){ const s = activeStats(); els.nDraws.textContent = formatNum(s.draws); const probs = state.config.probs; const exp = expectedCounts(s.draws, probs); els.statsTable.innerHTML=''; let chi2=0, k=0; for(const t of TIERS){ const o = s.counts[t]; const e = exp[t]; const tr = document.createElement('tr'); const ratio = s.draws? (o/s.draws):0; const delta = o - e; const rel = e>0? (delta/e):0; tr.innerHTML = `<td class="tier ${t}">${t}</td><td>${formatNum(o)}</td><td>${(ratio*100).toFixed(3)}%</td><td>${e.toFixed(2)}</td><td>${delta>=0?'+':''}${delta.toFixed(2)}</td><td>${(rel*100).toFixed(2)}%</td>`; els.statsTable.appendChild(tr); if(e>=5){ chi2 += (o-e)*(o-e)/e; k++; } }
        const dof = Math.max(0, k-1); if(dof>0){ const p = chiSquarePValue(chi2, dof); els.pval.textContent = isNaN(p)? '-' : p.toFixed(4); } else { els.pval.textContent = '-'; } }

      function drawChart(){ const s = activeStats(); const ctx = els.chart.getContext('2d'); const W = els.chart.width, H = els.chart.height; ctx.clearRect(0,0,W,H); // grid
        ctx.fillStyle = '#1a2231'; ctx.fillRect(0,0,W,H); ctx.strokeStyle = '#2a3140'; ctx.lineWidth = 1; for(let y=H-0.5; y>0; y-=44){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
        const counts = TIERS.map(t=> s.counts[t]); const max = Math.max(1, ...counts); const bw = (W-40)/TIERS.length; const gap = Math.min(16, bw*0.2); const barw = bw - gap; ctx.textAlign='center'; ctx.fillStyle = '#aeb7c6'; ctx.font = '12px system-ui'; const colors = {"SSS+":"#ffd166","SS+":"#ffb366","S+":"#ff9966","S":"#ff7f66","A":"#6ecb9b","B":"#6aa9ff","C":"#9aa5b1","D":"#738091"};
        for(let i=0;i<TIERS.length;i++){ const x = 20 + i*bw + gap/2; const h = (counts[i]/max)*(H-40); const y = H-20 - h; ctx.fillStyle = colors[TIERS[i]] || '#8ef'; ctx.fillRect(x, y, barw, h); ctx.fillStyle = '#aeb7c6'; ctx.fillText(TIERS[i], x+barw/2, H-6); }
      }

      // Log
      function getPartNameByKey(key){ const def = PART_DEFS.find((entry) => entry.key === key); return def ? def.name : ''; }
      function iconForPart(part){ return PART_ICONS[part] || '🎁'; }
      let activeLegendaryType = null;
      function isLegendaryVisible(){ return !!(els.legendaryOverlay && !els.legendaryOverlay.hidden && els.legendaryOverlay.classList.contains('visible')); }
      function openLegendaryModal(type){ if(!els.legendaryOverlay) return; activeLegendaryType = type; els.legendaryOverlay.hidden = false; requestAnimationFrame(()=> els.legendaryOverlay.classList.add('visible')); if(els.gearLegendaryModal) els.gearLegendaryModal.classList.toggle('active', type === 'gear'); if(els.characterLegendaryModal) els.characterLegendaryModal.classList.toggle('active', type === 'character'); document.body.classList.add('modal-open'); }
      function closeLegendaryModal(){ if(!els.legendaryOverlay) return; els.legendaryOverlay.classList.remove('visible'); els.legendaryOverlay.hidden = true; if(els.gearLegendaryModal) els.gearLegendaryModal.classList.remove('active'); if(els.characterLegendaryModal) els.characterLegendaryModal.classList.remove('active'); activeLegendaryType = null; if(!isUserOptionsOpen() && !state.ui.characterDetailOpen){ document.body.classList.remove('modal-open'); } }

      function hideRareAnimationOverlay(callback, options){
        const overlay = els.rareAnimationOverlay;
        if(!overlay){ if(typeof callback === 'function') callback(); return; }
        const anim = state.rareAnimations || {};
        const immediate = options && options.immediate;
        overlay.classList.remove('visible');
        overlay.classList.remove('preface-active');
        if(els.rareAnimationMessage){ els.rareAnimationMessage.style.display = 'none'; }
        setRareAnimationSkippable(true);
        if(immediate){
          overlay.hidden = true;
          if(typeof callback === 'function') callback();
          return;
        }
        if(anim.hideTimer){
          clearTimeout(anim.hideTimer);
          anim.hideTimer = null;
        }
        anim.hideTimer = setTimeout(()=>{
          overlay.hidden = true;
          anim.hideTimer = null;
          if(typeof callback === 'function') callback();
        }, RARE_ANIMATION_FADE_MS);
        state.rareAnimations = anim;
      }

      function showRareAnimationOverlay(asset, payload){
        const overlay = els.rareAnimationOverlay;
        if(!overlay) return;
        const img = els.rareAnimationImage;
        const labelEl = els.rareAnimationTier;
        const messageEl = els.rareAnimationMessage;
        const messageText = payload && typeof payload.message === 'string' ? payload.message : '';
        const sticky = !!(payload && payload.sticky === true);
        if(img){
          img.src = '';
          void img.offsetWidth;
          img.src = asset.src;
          img.alt = asset.alt || (payload && payload.label) || (payload && payload.tier ? `${payload.tier} 등급 획득 애니메이션` : '희귀 장비 애니메이션');
        }
        if(messageEl){
          messageEl.textContent = messageText;
          messageEl.style.display = messageText ? '' : 'none';
        }
        if(labelEl){
          const text = (payload && payload.label) || asset.label || (payload && payload.tier ? `${payload.tier} 획득!` : '희귀 장비 획득!');
          labelEl.textContent = text;
        }
        const prefaceMs = clampNumber(payload && payload.prefaceDuration, 0, 10000, messageText ? 1200 : 0);
        overlay.hidden = false;
        if(prefaceMs > 0 && messageText){
          overlay.classList.add('preface-active');
          setRareAnimationSkippable(false);
        } else {
          overlay.classList.remove('preface-active');
          if(messageEl){ messageEl.style.display = messageText ? '' : 'none'; }
          setRareAnimationSkippable(!sticky);
        }
        requestAnimationFrame(()=> overlay.classList.add('visible'));
        if(prefaceMs > 0 && messageText){
          let fallbackTimer = null;
          const endPreface = ()=>{
            overlay.classList.remove('preface-active');
            if(messageEl){ messageEl.style.display = 'none'; }
            if(sticky){
              setTimeout(()=> setRareAnimationSkippable(true), 800);
            } else {
              setRareAnimationSkippable(true);
            }
          };
          const schedule = (delay)=>{
            if(fallbackTimer){ clearTimeout(fallbackTimer); }
            const ms = typeof delay === 'number' ? delay : prefaceMs;
            fallbackTimer = setTimeout(endPreface, ms);
          };
          if(img){
            if(img.complete && img.naturalWidth > 0){
              schedule();
            } else {
              const onLoad = ()=>{
                img.removeEventListener('load', onLoad);
                schedule();
              };
              img.addEventListener('load', onLoad, { once: true });
              const fallbackDelay = Math.max(prefaceMs, ((payload && payload.duration) || RARE_ANIMATION_DURATION_MS) - 500);
              schedule(fallbackDelay);
            }
          } else {
            schedule();
          }
        } else if(sticky){
          setRareAnimationSkippable(false);
          setTimeout(()=> setRareAnimationSkippable(true), 800);
        } else {
          setRareAnimationSkippable(true);
        }
      }

      function clearRareAnimations(options){
        const anim = state.rareAnimations;
        if(!anim) return;
        if(anim.timer){
          clearTimeout(anim.timer);
          anim.timer = null;
        }
        if(anim.hideTimer){
          clearTimeout(anim.hideTimer);
          anim.hideTimer = null;
        }
        const current = anim.current;
        const queued = anim.queue.splice(0);
        anim.playing = false;
        anim.current = null;
        hideRareAnimationOverlay(()=>{
          if(current && typeof current.resolve === 'function') current.resolve();
          queued.forEach((entry)=>{ if(entry && typeof entry.resolve === 'function') entry.resolve(); });
        }, options);
        if(els.rareAnimationImage){ els.rareAnimationImage.src = ''; }
        if(els.rareAnimationTier){ els.rareAnimationTier.textContent = ''; }
        if(els.rareAnimationMessage){ els.rareAnimationMessage.textContent = ''; els.rareAnimationMessage.style.display = 'none'; }
      }

      function playNextRareAnimation(){
        const anim = state.rareAnimations;
        if(!anim) return;
        if(anim.timer){
          clearTimeout(anim.timer);
          anim.timer = null;
        }
        if(anim.queue.length === 0){
          anim.playing = false;
          anim.current = null;
          hideRareAnimationOverlay(undefined);
          return;
        }
        const next = anim.queue.shift();
        if(!next || !next.asset){
          if(next && typeof next.resolve === 'function') next.resolve();
          playNextRareAnimation();
          return;
        }
        anim.playing = true;
        anim.current = next;
        const payload = next.payload || {};
        const duration = payload.duration || 0;
        const sticky = payload.sticky === true;
        showRareAnimationOverlay(next.asset, payload);
        if(!sticky){
          anim.timer = setTimeout(()=> finishCurrentRareAnimation(), duration || RARE_ANIMATION_DURATION_MS);
        }
      }

      function finishCurrentRareAnimation(options){
        const anim = state.rareAnimations;
        if(!anim) return;
        if(anim.timer){
          clearTimeout(anim.timer);
          anim.timer = null;
        }
        const current = anim.current;
        hideRareAnimationOverlay(()=>{
          anim.playing = false;
          anim.current = null;
          if(current && typeof current.resolve === 'function') current.resolve();
          playNextRareAnimation();
        }, options);
      }

      function enqueueRareAnimation(){
        return Promise.resolve();
      }

      function setRareAnimationSkippable(value){
        if(state.rareAnimations){
          state.rareAnimations.skippable = !!value;
        }
        if(els.rareAnimationSkip){
          els.rareAnimationSkip.disabled = !value;
        }
      }

      function skipRareAnimation(){
        if(!state.rareAnimations?.skippable) return;
        const anim = state.rareAnimations;
        if(!anim) return;
        const pending = anim.queue.splice(0);
        pending.forEach((entry)=>{ if(entry && typeof entry.resolve === 'function') entry.resolve(); });
        if(anim.playing){
          finishCurrentRareAnimation({ immediate: true });
        } else {
          clearRareAnimations({ immediate: true });
        }
      }

      function resetRareAnimationState(options){
        clearRareAnimations({ immediate: !!(options && options.immediate) });
      }

      function playRareAnimation(payload){
        if(state.flags?.animationsEnabled === false){
          clearRareAnimations({ immediate: true });
          return Promise.resolve();
        }
        try {
          return enqueueRareAnimation(payload);
        } catch (error) {
          console.warn('희귀 연출 실행 실패', error);
          return Promise.resolve();
        }
      }

      async function withRareAnimationBlock(operation){
        const alreadyBlocked = !!state.ui.rareAnimationBlocking;
        if(!alreadyBlocked){
          state.ui.rareAnimationBlocking = true;
          updateDrawButtons();
        }
        try {
          await operation();
        } finally {
          if(!alreadyBlocked){
            state.ui.rareAnimationBlocking = false;
            updateDrawButtons();
          }
        }
      }

      async function playCharacterDrawAnimation(entry){
        if(!entry || !entry.tier) return;
        const labelParts = [entry.tier];
        if(entry.name){ labelParts.push(entry.name); }
        const label = labelParts.join(' ');
        const targetId = entry.characterId || entry.id || null;
        resetRareAnimationState({ immediate: true });
        await withRareAnimationBlock(()=> playRareAnimation({
          kind: 'character',
          tier: entry.tier,
          label,
          targetId,
          duration: 0,
          message: '강력한 힘이 느껴집니다',
          prefaceDuration: 1500,
          sticky: true
        }));
      }

      async function playLegendaryGearAnimation(tier, part){
        if(!tier) return Promise.resolve();
        const partName = getPartNameByKey(part) || part || '장비';
        resetRareAnimationState({ immediate: true });
        return withRareAnimationBlock(() => playRareAnimation({
          kind: 'gear',
          tier,
          label: `${tier} ${partName}`,
          targetId: part || null,
          duration: 0,
          message: `${partName} 획득!`,
          sticky: true
        }));
      }

      function fillCharacterStats(target, stats, classId){ if(!target) return; const rows = [
          ['hp', 'HP', false],
          ['atk', 'ATK', false],
          ['def', 'DEF', false],
          ['critRate', '치명타율', true],
          ['critDmg', '치명타피해', true],
          ['dodge', '회피', true],
          ['speed', '속도', false]
        ];
        const showDetails = isAdmin();
        let statMultipliers = null;
        let statOffsets = null;
        if(classId){
          const balance = ensureCharacterBalanceConfig()[classId] || DEFAULT_CHARACTER_BALANCE[classId] || DEFAULT_CHARACTER_BALANCE.warrior;
          statMultipliers = balance.stats || {};
          statOffsets = balance.offsets || {};
        }
        const html = rows.map(([key, label, percent]) => {
          const value = stats && typeof stats[key] === 'number' ? stats[key] : null;
          if(value === null){
            return `<div>${label}: <b>-</b></div>`;
          }
          const multiplier = Number(statMultipliers?.[key] ?? 1);
          const offset = Number(statOffsets?.[key] ?? 0);
          const type = percent ? 'percent' : 'flat';
          const text = formatSnapshotCell(value, multiplier, offset, type, showDetails);
          const display = showDetails ? text : `<b>${text}</b>`;
          return `<div>${label}: ${display}</div>`;
        }).join('');
        target.innerHTML = html;
      }
      function buildGearComparison(item, current){ const partName = getPartNameByKey(item.part) || ''; const partIcon = iconForPart(item.part); const newEffectiveVal = effectiveStat(item); const currentEffectiveVal = current ? effectiveStat(current) : 0; const diff = newEffectiveVal - currentEffectiveVal; let deltaText; let deltaClass;
        if(current){ if(diff === 0){ deltaText = '전투력 변화 없음'; deltaClass = 'neutral'; } else if(diff > 0){ deltaText = `전투력 변화: +${formatNum(diff)}`; deltaClass = 'positive'; } else { deltaText = `전투력 변화: ${formatNum(diff)}`; deltaClass = 'negative'; } }
        else { deltaText = `전투력 변화: +${formatNum(newEffectiveVal)}`; deltaClass = 'positive'; }
        return {
          title: `${item.tier} ${partName} 획득!`,
          partName,
          partIcon,
          newTier: item.tier,
          newPartLabel: `${partIcon} ${partName}`,
          newBase: formatNum(item.base || 0),
          newEffective: formatNum(newEffectiveVal),
          newEffectiveValue: newEffectiveVal,
          currentTier: current ? current.tier : '없음',
          currentPartLabel: current ? `${iconForPart(current.part)} ${getPartNameByKey(current.part) || ''}` : '장착 장비 없음',
          currentBase: current ? formatNum(current.base || 0) : '-',
          currentEffective: current ? formatNum(currentEffectiveVal) : '-',
          currentEffectiveValue: currentEffectiveVal,
          deltaText,
          deltaClass,
          diff
        };
      }

      function showGearLegendaryOverlay(comparison, current){ if(!els.legendaryOverlay) return Promise.resolve('spare'); openLegendaryModal('gear'); if(els.gearLegendaryTitle) els.gearLegendaryTitle.textContent = comparison.title; if(els.gearNewTier){ els.gearNewTier.className = `tier ${comparison.newTier}`; els.gearNewTier.textContent = comparison.newTier; } if(els.gearNewPart) els.gearNewPart.textContent = comparison.newPartLabel; if(els.gearNewBase) els.gearNewBase.textContent = comparison.newBase; if(els.gearNewEffective) els.gearNewEffective.textContent = comparison.newEffective; if(els.gearCurrentTier){ els.gearCurrentTier.className = current ? `tier ${comparison.currentTier}` : 'tier'; els.gearCurrentTier.textContent = comparison.currentTier; }
        if(els.gearCurrentPart) els.gearCurrentPart.textContent = comparison.currentPartLabel; if(els.gearCurrentBase) els.gearCurrentBase.textContent = comparison.currentBase; if(els.gearCurrentEffective) els.gearCurrentEffective.textContent = comparison.currentEffective; if(els.gearComparisonDelta){ els.gearComparisonDelta.textContent = comparison.deltaText; if(comparison.deltaClass === 'positive'){ els.gearComparisonDelta.style.color = 'var(--accent)'; } else if(comparison.deltaClass === 'negative'){ els.gearComparisonDelta.style.color = 'var(--danger)'; } else { els.gearComparisonDelta.style.color = 'var(--muted)'; } }
        return new Promise((resolve) => {
          const cleanup = (choice) => { if(els.gearEquipBtn) els.gearEquipBtn.onclick = null; if(els.gearSpareBtn) els.gearSpareBtn.onclick = null; if(els.gearDiscardBtn) els.gearDiscardBtn.onclick = null; closeLegendaryModal(); resolve(choice); };
          if(els.gearEquipBtn) els.gearEquipBtn.onclick = () => cleanup('equip');
          if(els.gearSpareBtn) els.gearSpareBtn.onclick = () => cleanup('spare');
          if(els.gearDiscardBtn) els.gearDiscardBtn.onclick = () => cleanup('discard');
        });
      }
      function showCharacterLegendaryModal(payload){ if(!els.legendaryOverlay) return Promise.resolve(); const { name, tier, className, classId, stats, count, image, imageSources, activeName, activeTier, activeClass, activeClassId, activeStats, activeCount, activeImage } = payload;
        openLegendaryModal('character');
        if(els.characterLegendaryTitle) els.characterLegendaryTitle.textContent = `${tier} ${name} 획득!`;
        if(els.characterNewName) els.characterNewName.textContent = name;
        if(els.characterNewTier){ els.characterNewTier.className = `char-tier tier ${tier}`; els.characterNewTier.textContent = tier; }
        if(els.characterNewClass) els.characterNewClass.textContent = className || '-';
        if(els.characterNewCount) els.characterNewCount.textContent = `보유: ${formatNum(count || 0)}`;
        const newImageSrc = image || (imageSources && imageSources[0]) || CHARACTER_IMAGE_PLACEHOLDER;
        if(els.characterNewImage){ els.characterNewImage.src = newImageSrc; els.characterNewImage.alt = name || '새 캐릭터'; }
        fillCharacterStats(els.characterNewStats, stats || {}, classId || null);
        if(els.characterCurrentName) els.characterCurrentName.textContent = activeName || '-';
        if(els.characterCurrentTier){ const tierLabel = activeTier || '-'; els.characterCurrentTier.className = `char-tier tier ${activeTier || ''}`; els.characterCurrentTier.textContent = tierLabel; }
        if(els.characterCurrentClass) els.characterCurrentClass.textContent = activeClass || '-';
        if(els.characterCurrentCount) els.characterCurrentCount.textContent = `보유: ${formatNum(activeCount || 0)}`;
        const activeImageSrc = activeImage || CHARACTER_IMAGE_PLACEHOLDER;
        if(els.characterCurrentImage){ els.characterCurrentImage.src = activeImageSrc; els.characterCurrentImage.alt = activeName || '현재 캐릭터'; }
        fillCharacterStats(els.characterCurrentStats, activeStats || {}, activeClassId || null);
        return new Promise((resolve) => {
          const cleanup = () => { if(els.characterLegendaryClose) els.characterLegendaryClose.onclick = null; closeLegendaryModal(); resolve(); };
          if(els.characterLegendaryClose) els.characterLegendaryClose.onclick = cleanup;
        });
      }
      function createGearCard(partDef, item, opts){ opts = opts || {}; const card = document.createElement('div'); card.className = 'gear-card'; if(opts.kind) card.classList.add(opts.kind); card.dataset.slot = partDef.key; const icon = iconForPart(partDef.key); if(item){ card.dataset.tier = item.tier||'NONE'; const isEquip = opts.kind === 'gear-equip'; const isSpare = opts.kind === 'gear-spare'; if(isEquip) card.classList.add('equipped'); const enhState = gearEnhancementState(item);
        const currentRule = getEnhancementRule(enhState.level);
        const customLabel = (currentRule && currentRule.label) ? currentRule.label : null;
        const levelLabel = enhState.isMax ? ' MAX' : (enhState.level ? (customLabel ? ' ' + customLabel : ' +' + enhState.level) : '');
        const label = `${item.tier}${levelLabel}`; const statLabel = item.type === 'atk' ? 'ATK' : 'DEF'; const eff = formatNum(effectiveStat(item)); const base = formatNum(item.base||0);
        const progressLevelLabel = customLabel || `Lv.${enhState.level}`;
        const progressLabel = enhState.isMax ? 'MAX 강화' : `${progressLevelLabel} ${enhState.progress}/${enhState.next?.cost || 0}`; card.innerHTML = `
          <div class="gear-slot">${partDef.name}</div>
          <div class="gear-icon">${icon}</div>
          <div class="gear-tier-text">${label}</div>
          <div class="gear-stat">${statLabel} ${eff}<span class="gear-sub">기본 ${base} · ${progressLabel}</span></div>`; if(opts.button){ const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'equip-btn'; btn.dataset.part = partDef.key; btn.textContent = opts.button; card.appendChild(btn); } if(isEquip){ const badge = document.createElement('div'); badge.className = 'gear-badge'; badge.textContent = '장착중'; card.appendChild(badge); } else if(isSpare){ const badge = document.createElement('div'); badge.className = 'gear-badge spare'; badge.textContent = '예비'; card.appendChild(badge); } }
        else {
          card.dataset.tier = 'NONE'; card.classList.add('empty'); const emptyText = opts.emptyText || '장비 없음'; card.innerHTML = `
          <div class="gear-slot">${partDef.name}</div>
          <div class="gear-icon">${icon}</div>
          <div class="gear-tier-text muted">${emptyText}</div>`; }
        return card; }
      function appendLog(rec){ const div = document.createElement('div'); div.className='item'; const dt = new Date(rec.ts); const time = dt.toLocaleTimeString('ko-KR'); const partName = getPartNameByKey(rec.part) || '-'; div.innerHTML = `<span class="small muted">#${rec.id}</span>
        <span class="pill tier ${rec.tier}">${rec.tier}</span>
        <span class="small">${partName}</span>
        <span class="small">${formatNum(rec.stat||0)}</span>
        <span class="muted small">${time}</span>
        <span class="sep"></span>
        <span class="small muted">run:${rec.runId}</span>
        <span class="small muted">cfg:${rec.cfgHash.slice(0,8)}</span>`; els.log.prepend(div); const maxItems = 200; while(els.log.children.length>maxItems){ els.log.removeChild(els.log.lastChild); } }

      function applyCharacterImageFallback(img, sources){ if(!(img instanceof HTMLImageElement)) return; const list = Array.isArray(sources) ? sources.filter(Boolean) : []; const unique = Array.from(new Set(list)); let index = 0; const handleFallback = ()=>{ while(index < unique.length){ const candidate = unique[index++]; if(candidate){ img.src = candidate; return; } }
          img.removeEventListener('error', handleError);
          img.src = CHARACTER_IMAGE_PLACEHOLDER;
        };
        const handleError = ()=>{ handleFallback(); };
        img.addEventListener('error', handleError);
        if(unique.length === 0){ img.src = CHARACTER_IMAGE_PLACEHOLDER; return; }
        handleFallback(); }

      function createCharacterImageElement(name, sources){ const img = document.createElement('img'); img.alt = name || '캐릭터'; img.decoding = 'async'; img.loading = 'lazy'; applyCharacterImageFallback(img, sources); return img; }

      function renderDrawResults(items, count){ if(!els.drawResults) return; const wrap = els.drawResults; const grid = wrap ? wrap.querySelector('.draw-result-grid') : null; const title = wrap ? wrap.querySelector('h3') : null; if(!items || !items.length){ if(wrap) wrap.style.display = 'none'; if(grid) grid.innerHTML=''; resetRareAnimationState({ immediate: true }); return; }
        if(title){ title.textContent = `${count}회 뽑기 결과`; }
        if(grid){ const frag = document.createDocumentFragment(); items.forEach(function(entry){ const card = document.createElement('div'); card.className = 'draw-card'; if(entry.type === 'pet'){ card.classList.add('pet'); const icon = entry.icon || '🐾'; const name = entry.name || entry.petId || '펫'; card.innerHTML = `
                <div class="draw-icon">${icon}</div>
                <div class="draw-part">${name}</div>`;
          } else if(entry.type === 'character'){ card.classList.add('character'); const tierLabel = document.createElement('div'); tierLabel.className = `tier-label tier ${entry.tier || ''}`; tierLabel.textContent = entry.tier || ''; const iconWrap = document.createElement('div'); iconWrap.className = 'draw-icon'; const imgEl = createCharacterImageElement(entry.name || entry.characterId || '캐릭터', entry.imageSources || (entry.image ? [entry.image] : [])); iconWrap.appendChild(imgEl); const nameEl = document.createElement('div'); nameEl.className = 'draw-part'; nameEl.textContent = entry.name || entry.characterId || '캐릭터'; const subEl = document.createElement('div'); subEl.className = 'draw-sub muted small'; subEl.textContent = entry.className || ''; card.appendChild(tierLabel); card.appendChild(iconWrap); card.appendChild(nameEl); card.appendChild(subEl);
          } else {
            console.log('🔍 gear entry:', {
              tier: entry.tier,
              icon: entry.icon,
              partName: entry.partName,
              part: entry.part
            });
            card.innerHTML = `
                <div class="tier-label tier ${entry.tier}">${entry.tier}</div>
                <div class="draw-icon">${entry.icon || '🎁'}</div>
                <div class="draw-part">${entry.partName || '알 수 없음'}</div>`;
          }
          frag.appendChild(card);
        }); grid.innerHTML=''; grid.appendChild(frag); }
        if(wrap) wrap.style.display = '';
        items.filter(function(entry){ const kind = entry.type || 'gear'; return kind === 'gear' && entry.tier; }).forEach(function(entry){
          const kind = entry.type || 'gear';
          const parts = [];
          if(entry.tier) parts.push(entry.tier);
          if(entry.partName) parts.push(entry.partName);
          const label = parts.length ? `${parts.join(' ')} 획득!` : '희귀 획득!';
          const targetId = entry.part || entry.partName || null;
          if(entry.item && entry.item.__animationPlayed){
            return;
          }
          playRareAnimation({ kind, tier: entry.tier, label, targetId });
        });
        items.filter(function(entry){ return entry.type === 'character' && entry.tier && isAtLeast(entry.tier, 'SS+'); }).forEach(function(entry){
          if(entry.__animationPlayed){
            return;
          }
          const labelParts = [entry.tier];
          if(entry.name){ labelParts.push(entry.name); }
          const label = labelParts.join(' ');
          playRareAnimation({ kind: 'character', tier: entry.tier, label, targetId: entry.characterId || null });
        });
      }

      function petWeightEntries(){
        const entries = PET_IDS.map((id) => {
          const raw = state.petGachaWeights?.[id];
          const weight = (typeof raw === 'number' && isFinite(raw) && raw >= 0) ? raw : 1;
          return { id, weight };
        });
        const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
        if (!(total > 0)) {
          entries.forEach((entry) => { entry.weight = 1; });
        }
        return entries;
      }

      function renderPetStats(){ if(!els.petStatsTable) return; const tbody = els.petStatsTable; tbody.innerHTML=''; const pets = ensurePetState(); const entries = petWeightEntries(); const total = entries.reduce((sum, e)=> sum + e.weight, 0) || entries.length; entries.forEach((entry) => {
          const def = PET_DEFS[entry.id] || { name: entry.id, icon: '🐾' };
          const percent = total > 0 ? (entry.weight / total) * 100 : (100 / entries.length);
          const owned = pets.owned?.[entry.id] || 0;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${def.icon || '🐾'} ${def.name}</td><td>${percent.toFixed(2)}%</td><td>${formatNum(owned)}</td>`;
          tbody.appendChild(tr);
        }); }

      function updateCharacterStatsSummary(stats){
        if(state.ui.statsMode !== 'character') return;
        const snapshot = stats ? sanitizeCharacterDrawStats(stats) : sanitizeCharacterDrawStats(state.characterStats);
        const observedTotal = Object.values(snapshot.counts || {}).reduce((sum, val)=> sum + (val || 0), 0);
        const totalDraws = Math.max(0, snapshot.draws || 0, observedTotal);
        if(els.nDraws){ els.nDraws.textContent = formatNum(totalDraws); }
        if(els.pval){ els.pval.textContent = '–'; }
      }

      function renderCharacterStats(){ if(!els.characterStatsTable) return; const tbody = els.characterStatsTable; tbody.innerHTML=''; const stats = sanitizeCharacterDrawStats(state.characterStats); state.characterStats = stats; const observedTotal = Object.values(stats.counts || {}).reduce((sum, val)=> sum + (val || 0), 0); const totalDraws = Math.max(0, stats.draws || 0, observedTotal); const probs = state.config.characterProbs || state.config.probs || {}; const tiers = [...TIERS];
        if(totalDraws === 0){ const tr = document.createElement('tr'); tr.innerHTML = `<td colspan="6" class="muted small">캐릭터 뽑기 기록이 없습니다.</td>`; tbody.appendChild(tr); updateCharacterStatsSummary(stats); return; }
        tiers.sort((a,b)=> TIER_INDEX[a]-TIER_INDEX[b]);
        tiers.forEach((tier)=>{
          const prob = Math.max(0, probs[tier] || 0);
          const count = Math.max(0, stats.counts?.[tier] || 0);
          const expected = totalDraws * prob;
          const ratio = totalDraws > 0 ? count / totalDraws : 0;
          const delta = count - expected;
          const relErrorText = expected > 0 ? `${((delta / expected) * 100).toFixed(2)}%` : (count > 0 ? '∞' : '–');
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="tier ${tier}">${tier}</td>
            <td>${(ratio * 100).toFixed(3)}%</td>
            <td>${expected.toFixed(2)}</td>
            <td>${formatNum(count)}</td>
            <td>${delta >= 0 ? '+' : ''}${delta.toFixed(2)}</td>
            <td>${relErrorText}</td>`;
          tbody.appendChild(tr);
        });
        updateCharacterStatsSummary(stats);
      }

      function renderPetWeightTable(){ if(!els.petWeightTableBody) return; const tbody = els.petWeightTableBody; tbody.innerHTML = ''; PET_IDS.forEach((id) => {
          const def = PET_DEFS[id] || { name: id, icon: '🐾' };
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${def.icon || '🐾'} ${def.name}</td><td><input type="text" step="any" min="0" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" data-pet="${id}" class="pet-weight-input" style="width:100px" /></td>`;
          tbody.appendChild(tr);
        });
        updatePetWeightInputs();
      }

      function updatePetWeightInputs(){ if(!els.petWeightTableBody) return; const canEdit = isAdmin() && !state.config.locked; const inputs = els.petWeightTableBody.querySelectorAll('input[data-pet]'); inputs.forEach((input) => {
          const petId = input.dataset.pet;
          const value = state.petGachaWeights?.[petId];
          input.value = typeof value === 'number' && isFinite(value) ? String(value) : '1';
          input.disabled = !canEdit;
          input.title = canEdit ? '' : '관리자만 수정 가능하며, 잠겨 있지 않아야 합니다.';
        });
        renderPetStats();
      }

      function renderAdminPetWeightTable(){ if(!els.adminPetWeightTableBody) return; const tbody = els.adminPetWeightTableBody; tbody.innerHTML = ''; PET_IDS.forEach((id) => {
          const def = PET_DEFS[id] || { name: id, icon: '🐾' };
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${def.icon || '🐾'} ${def.name}</td><td><input type="text" step="any" min="0" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" data-admin-pet="${id}" class="admin-pet-weight-input" style="width:100px" /></td>`;
          tbody.appendChild(tr);
        });
        updateAdminPetWeightInputs();
      }

      function updateAdminPetWeightInputs(){ if(!els.adminPetWeightTableBody) return; const canEdit = isAdmin() && !state.config.locked; const inputs = els.adminPetWeightTableBody.querySelectorAll('input[data-admin-pet]'); inputs.forEach((input) => {
          const petId = input.dataset.adminPet;
          const value = state.petGachaWeights?.[petId];
          input.value = typeof value === 'number' && isFinite(value) ? String(value) : '1';
          input.disabled = !canEdit;
          input.title = canEdit ? '' : '관리자만 수정 가능하며, 잠겨 있지 않아야 합니다.';
        });
      }

      function updateGachaModeView(mode){ if(mode){ state.ui.gachaMode = mode === 'pet' ? 'pet' : (mode === 'character' ? 'character' : 'gear'); }
        const current = state.ui.gachaMode || 'gear';
        const isGear = current === 'gear';
        const isPet = current === 'pet';
        const isCharacter = current === 'character';
        if(!isGear){ setDrawMessage('', null); }
        const configButtons = {
          gear: els.gachaModeGearConfig,
          pet: els.gachaModePetConfig,
          character: els.gachaModeCharacterConfig
        };
        const drawButtons = {
          gear: els.gachaModeGearDraw,
          pet: els.gachaModePetDraw,
          character: els.gachaModeCharacterDraw
        };
        Object.entries(configButtons).forEach(([key, btn]) => {
          if(btn) btn.classList.toggle('active', key === current);
        });
        Object.entries(drawButtons).forEach(([key, btn]) => {
          if(btn) btn.classList.toggle('active', key === current);
        });
        if(els.gearConfigWrap) els.gearConfigWrap.style.display = isGear ? '' : 'none';
        if(els.petConfigWrap) els.petConfigWrap.style.display = isPet ? '' : 'none';
        if(els.characterConfigWrap) els.characterConfigWrap.style.display = isCharacter ? '' : 'none';
        if(isPet){ updatePetWeightInputs(); }
        if(els.gearDrawControls) els.gearDrawControls.style.display = isGear ? '' : 'none';
        if(els.petDrawControls) els.petDrawControls.style.display = isPet ? '' : 'none';
        if(els.characterDrawControls) els.characterDrawControls.style.display = isCharacter ? '' : 'none';
        const desiredStats = isGear ? 'gear' : (isPet ? 'pet' : 'character');
        state.ui.statsMode = desiredStats;
        if(els.statsMode && els.statsMode.value !== desiredStats){ els.statsMode.value = desiredStats; }
        updateStatsModeView();
        updateDrawButtons();
      }

      function updateAdminGachaModeView(mode){
        if(mode){ state.ui.gachaMode = mode === 'pet' ? 'pet' : (mode === 'character' ? 'character' : 'gear'); }
        const current = state.ui.gachaMode || 'gear';
        const isGear = current === 'gear';
        const isPet = current === 'pet';
        const isCharacter = current === 'character';

        const adminConfigButtons = {
          gear: els.adminGachaModeGearConfig,
          pet: els.adminGachaModePetConfig,
          character: els.adminGachaModeCharacterConfig
        };

        Object.entries(adminConfigButtons).forEach(([key, btn]) => {
          if(btn) btn.classList.toggle('active', key === current);
        });

        if(els.adminGearConfigWrap) els.adminGearConfigWrap.style.display = isGear ? '' : 'none';
        if(els.adminPetConfigWrap) els.adminPetConfigWrap.style.display = isPet ? '' : 'none';
        if(els.adminCharacterConfigWrap) els.adminCharacterConfigWrap.style.display = isCharacter ? '' : 'none';

        if(isPet){ updatePetWeightInputs(); }

        // Also sync the probability tab view
        updateGachaModeView();

        // Initialize admin tables
        if(isGear && els.adminWeightsTable) {
          buildWeightsTable(els.adminWeightsTable, 'admin');
          updateAdminWeightsInputs();
        }
        if(isCharacter && els.adminCharacterWeightsBody) {
          buildCharacterWeightsTable(els.adminCharacterWeightsBody, 'admin');
          updateAdminCharacterWeightsInputs();
        }
        if(isPet) {
          renderPetWeightTable();
          if(els.adminPetWeightTableBody) {
            renderAdminPetWeightTable();
          }
        }
      }

      function updatePetList(){ if(!els.petList) return; const pets = ensurePetState(); const container = els.petList; container.innerHTML=''; PET_IDS.forEach((id) => {
          const def = PET_DEFS[id] || { name: id, icon: '🐾' };
          const owned = pets.owned?.[id] || 0;
          const card = document.createElement('div');
          card.className = 'pet-card';
          if (pets.active === id) card.classList.add('active');
          const info = document.createElement('div');
          info.className = 'info';
          const status = pets.active === id ? ' · 장착중' : '';
          info.innerHTML = `<div class="name">${def.icon || '🐾'} ${def.name}</div><div class="count">보유: ${formatNum(owned)}${status}</div>`;
          const ability = describePetAbilities(def);
          const abilityText = [ability.passive, ability.active].filter(Boolean).join(' · ');
          if (abilityText) {
            const desc = document.createElement('div');
            desc.className = 'desc';
            desc.textContent = abilityText;
            info.appendChild(desc);
          }
          const btnWrap = document.createElement('div');
          btnWrap.className = 'actions';
          const equipBtn = document.createElement('button');
          equipBtn.type = 'button';
          if (pets.active === id) {
            equipBtn.textContent = '장착중';
            equipBtn.disabled = true;
          } else {
            equipBtn.textContent = '장착';
            equipBtn.disabled = !isAdmin() && owned <= 0;
            equipBtn.addEventListener('click', () => setActivePet(id));
          }
          btnWrap.appendChild(equipBtn);
          card.appendChild(info);
          card.appendChild(btnWrap);
          container.appendChild(card);
        });
        renderPetStats();
      }

      function setActivePet(petId){ if(!PET_IDS.includes(petId)) return; const pets = ensurePetState(); if(!isAdmin() && (pets.owned?.[petId] || 0) <= 0){ alert('해당 펫을 보유하고 있지 않습니다.'); return; } if(pets.active === petId) return; pets.active = petId; if(userProfile) userProfile.pets = pets; updateInventoryView(); updatePetList(); markProfileDirty(); }

      function rollPet(randomValue){ const value = (typeof randomValue === 'number' && isFinite(randomValue) && randomValue >= 0) ? randomValue : Math.random(); const entries = petWeightEntries(); const total = entries.reduce((sum, entry) => sum + entry.weight, 0) || entries.length; let ticket = value * total; for(const entry of entries){ const weight = entry.weight > 0 ? entry.weight : 0; ticket -= weight; if(ticket <= 0){ return entry.id; } }
        return entries.length ? entries[entries.length - 1].id : PET_IDS[0]; }

      function runPetDraws(count){ if((state.ui.gachaMode || 'gear') !== 'pet'){ updateGachaModeView('pet'); }
        const n = Math.max(1, parseInt(count, 10) || 1); const pets = ensurePetState(); const admin = isAdmin(); const available = admin ? Number.POSITIVE_INFINITY : (state.items.petTicket || 0); if(!admin && available < n){ alert('펫 뽑기권이 부족합니다.'); return; }
        state.inRun = true; updateDrawButtons(); const rng = getRng(); const results = []; for(let i=0; i<n; i+=1){ const petId = rollPet(rng()); pets.owned[petId] = (pets.owned[petId] || 0) + 1; const def = PET_DEFS[petId] || { name: petId, icon: '🐾' }; results.push({ type:'pet', petId, name: def.name, icon: def.icon }); }
        if(!admin){ state.items.petTicket = Math.max(0, (state.items.petTicket || 0) - n); }
        if(userProfile){ userProfile.pets = pets; userProfile.items = state.items; }
        state.inRun = false;
        updateItemCountsView();
        updateInventoryView();
        updateDrawButtons();
        renderDrawResults(results, n);
        renderPetStats();
        markProfileDirty();
      }

      async function runCharacterDraws(preset){
        if(!preset || typeof preset !== 'object') return;
        if((state.ui.gachaMode || 'gear') !== 'character'){ updateGachaModeView('character'); }
        const { count, totalCost, boost = 0, label = '캐릭터 뽑기', descriptor } = preset;
        const n = Math.max(1, Number(count) || 1);
        const cost = Math.max(0, Number(totalCost) || 0);
        if(!isAdmin() && !canSpend(cost)){ setDrawMessage(`포인트가 부족합니다. (필요: ${formatNum(cost)} 포인트)`, 'warn'); updateDrawButtons(); return; }
        if(!isAdmin() && !spendPoints(cost)){ setDrawMessage(`포인트가 부족합니다. (필요: ${formatNum(cost)} 포인트)`, 'warn'); updateDrawButtons(); return; }
        if(isAdmin()) updatePointsView();
        const boostText = boost > 0 ? ` (S+ 확률 +${Math.round(boost * 100)}%p)` : '';
        setDrawMessage(`${label} 진행 중...${boostText}`, 'warn');
        ensureCharacterState();
        const characters = state.characters;
        const charStats = sanitizeCharacterDrawStats(state.characterStats);
        state.characterStats = charStats;
        const previousOverride = state.characterDrawProbs;
        state.characterDrawProbs = boost > 0 ? withSPlusBoost(baseCharacterProbs(), boost) : null;
        state.inRun = true;
        state.cancelFlag = false;
        if(els.cancel) els.cancel.disabled = false;
        updateDrawButtons();
        const rng = getRng();
        const speed = parseInt(els.speed?.value || '0', 10);
        const results = [];
        const shouldRender = (n === 1 || n === 10);
        const collected = [];
        const collectFn = shouldRender ? function(payload){ if(payload) collected.push(payload); } : null;
        const batch = n >= 200; const updateEvery = n>=10000? 200 : n>=1000? 50 : n>=200? 10 : 1;
        const processCharacter = async (tier, index, charId, payload)=>{
          results.push(payload);
          if(typeof collectFn === 'function'){ collectFn(payload); }
          announceRareDrop('character', tier, payload.name || payload.characterId || '캐릭터');
          if(isLegendaryCharacterTier(tier)){
            const activeId = getActiveCharacterId();
            const activeDef = getCharacterDefinition(activeId) || getActiveCharacterDefinition();
            const activeSources = getCharacterImageVariants(activeId);
            if(activeDef?.image && !activeSources.includes(activeDef.image)){ activeSources.unshift(activeDef.image); }
            if(isAtLeast(tier, 'SS+')){
              await playCharacterDrawAnimation({ tier, name: payload.name, characterId: payload.characterId });
            }
            await showCharacterLegendaryModal({
              name: payload.name || charId,
              tier,
              className: payload.className || '',
              classId: payload.classId || null,
              stats: payload.stats || {},
              count: characters.owned[charId] || 0,
              image: payload.image,
              imageSources: payload.imageSources || [],
              activeName: activeDef?.name || activeId,
              activeTier: activeDef?.tier || '-',
              activeClass: activeDef?.className || '-',
              activeClassId: activeDef?.classId || null,
              activeStats: activeDef?.stats || {},
              activeCount: characters.owned?.[activeId] || 0,
              activeImage: activeSources[0] || CHARACTER_IMAGE_PLACEHOLDER
            });
          }
          if(batch && ((index + 1) % updateEvery === 0)){
            renderCharacterStats();
          }
          await maybeDelay(speed);
          updateProgress(results.length, n);
        };
        for(let i = 0; i < n; i += 1){
          if(state.cancelFlag) break;
          const tier = chooseTier(activeCharacterProbs(), rng);
          const charId = randomCharacterIdForTier(tier, rng) || DEFAULT_CHARACTER_ID;
          if(!charId) continue;
          characters.owned[charId] = (characters.owned[charId] || 0) + 1;
          charStats.draws = clampNumber((charStats.draws || 0) + 1, 0, Number.MAX_SAFE_INTEGER, 0);
          if(!Object.prototype.hasOwnProperty.call(charStats.counts, tier)){
            charStats.counts[tier] = 0;
          }
          charStats.counts[tier] = clampNumber((charStats.counts[tier] || 0) + 1, 0, Number.MAX_SAFE_INTEGER, 0);
          const def = getCharacterDefinition(charId) || { name: charId, image: '', className: '' };
          const imageSources = getCharacterImageVariants(charId);
          if(def.image && !imageSources.includes(def.image)){ imageSources.unshift(def.image); }
          const payload = {
            type: 'character',
            characterId: charId,
            tier,
            name: def.name || charId,
            image: imageSources[0] || '',
            imageSources,
            className: def.className || '',
            classId: def.classId || null,
            stats: def.stats || {}
          };
          await processCharacter(tier, i, charId, payload);
        }
        if(batch){ renderCharacterStats(); }
        ensureCharacterState();
        state.characters = characters;
        if(userProfile) userProfile.characters = characters;
        userProfile.characterStats = charStats;
        state.inRun = false;
        if(els.cancel) els.cancel.disabled = true;
        updateInventoryView();
        updateDrawButtons();
        if(shouldRender){ renderDrawResults(collected, n); } else { renderDrawResults([], 0); }
        renderCharacterStats();
        updateProgress(0, 100);
        if(state.cancelFlag){
          setDrawMessage('뽑기를 중단했습니다. 이미 획득한 결과만 적용되었습니다.', 'warn');
          state.cancelFlag = false;
        } else {
          const descriptorText = descriptor ? `${descriptor} · ` : '';
          setDrawMessage(`${label} 완료! ${descriptorText}총 ${n}회 결과를 확인하세요.`, 'ok');
        }
        state.characterDrawProbs = previousOverride;
        markProfileDirty();
      }

      function updateStatsModeView(){ let mode = state.ui.statsMode || 'gear'; if(els.statsMode){ mode = els.statsMode.value || mode; state.ui.statsMode = mode; } if(els.statsMode && els.statsMode.value !== mode){ els.statsMode.value = mode; }
        if(els.gearStatsWrap) els.gearStatsWrap.style.display = mode === 'gear' ? '' : 'none';
        if(els.petStatsWrap) els.petStatsWrap.style.display = mode === 'pet' ? '' : 'none';
        if(els.characterStatsWrap) els.characterStatsWrap.style.display = mode === 'character' ? '' : 'none';
        if(els.resetSession) els.resetSession.style.display = mode === 'gear' ? '' : 'none';
        if(els.resetGlobal) els.resetGlobal.style.display = mode === 'gear' ? '' : 'none';
        if(mode === 'pet'){
          renderPetStats();
        } else if(mode === 'character'){
          renderCharacterStats();
        } else {
          syncStats();
          drawChart();
        }
      }

      function resetSession(){
        if(!confirm('세션 뽑기 통계와 로그를 초기화할까요?\n(장비와 인벤토리는 보존됩니다)')) return;

        // 통계와 로그만 초기화
        state.session = { draws:0, counts:Object.fromEntries(TIERS.map(t=>[t,0])), history: [] };
        state.pitySince = 0;

        // 장비와 인벤토리는 보존 (삭제 안함)
        // state.inventory = []; // 제거됨 - 인벤토리 보존
        // state.equip = {head:null, body:null, main:null, off:null, boots:null}; // 제거됨 - 장비 보존
        // state.spares = { head:null, body:null, main:null, off:null, boots:null }; // 제거됨 - 여분 장비 보존

        // 버프는 초기화 (시간 관련이므로 리셋하는 것이 맞음)
        state.buffs = { accelUntil:0, accelMultiplier:1, hyperUntil:0, hyperMultiplier:1 };

        // UI 업데이트
        els.log.innerHTML = '';
        updateCombatView();
        updateInventoryView();
        buildForgeTargetOptions();
        updateForgeInfo();
        syncStats();
        drawChart();
        updateProgress(0, 100);
        markProfileDirty();
      }
      function resetGlobal(){
        if(!confirm('전체(전역) 뽑기 통계를 초기화할까요?\n(장비와 인벤토리는 보존됩니다)\n\n이 작업은 취소할 수 없습니다.')) return;

        // 전역 통계만 초기화 (장비/인벤토리 보존)
        state.global = { draws:0, counts:Object.fromEntries(TIERS.map(t=>[t,0])) };
        saveGlobal();

        if(els.scope.value==='global'){
          syncStats();
          drawChart();
        }
      }

      // Save/Load/Share
      function compactConfig(){ const {weights, probs, characterWeights, characterProbs, pity, minGuarantee10, seed, locked, version, dropRates, shopPrices, goldScaling, potionSettings, hyperPotionSettings, monsterScaling, difficultyAdjustments, petWeights, drawPresets, rareAnimations} = state.config; return {weights, probs, characterWeights, characterProbs, pity, minGuarantee10, seed, locked, version, dropRates, shopPrices, goldScaling, potionSettings, hyperPotionSettings, monsterScaling, difficultyAdjustments, petWeights, drawPresets, rareAnimations}; }
      function saveConfigFile(){ const data = JSON.stringify(compactConfig(), null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gacha-config.json'; a.click(); URL.revokeObjectURL(a.href); }
      function loadConfigFile(e){ const f = e.target.files[0]; if(!f) return; const rd = new FileReader(); rd.onload = ()=>{ try{ const cfg = JSON.parse(rd.result); applyLoadedConfig(cfg); } catch(err){ alert('불러오기 실패: '+err); } }; rd.readAsText(f); e.target.value=''; }
      function applyLoadedConfig(cfg){
        if(!cfg || !cfg.weights) { alert('형식이 올바르지 않습니다.'); return; }
        state.config.weights = { ...defaultWeights, ...cfg.weights };
        state.config.probs = normalize(state.config.weights);
        state.config.characterWeights = sanitizeWeights(cfg.characterWeights || cfg.characterGachaWeights || state.config.characterWeights);
        state.config.characterProbs = normalize(state.config.characterWeights);
        state.config.seed = cfg.seed || '';
        state.config.locked = !!cfg.locked;
        state.config.pity = cfg.pity || { enabled:false, floorTier:'S', span:90 };
        state.config.minGuarantee10 = cfg.minGuarantee10 || { enabled:false, tier:'A' };
        state.config.dropRates = migrateLegacyDropRates(cfg.dropRates);
        state.config.goldScaling = normalizeGoldScaling(cfg.goldScaling);
        state.config.shopPrices = normalizeShopPrices(cfg.shopPrices);
        state.config.potionSettings = normalizePotionSettings(cfg.potionSettings, DEFAULT_POTION_SETTINGS);
        state.config.hyperPotionSettings = normalizePotionSettings(cfg.hyperPotionSettings, DEFAULT_HYPER_POTION_SETTINGS);
        state.config.monsterScaling = normalizeMonsterScaling(cfg.monsterScaling);
        state.config.difficultyAdjustments = sanitizeDifficultyAdjustments(cfg.difficultyAdjustments || state.config.difficultyAdjustments);
        state.config.petWeights = sanitizePetWeights(cfg.petWeights || cfg.petGachaWeights || state.config.petWeights);
        state.config.drawPresets = sanitizeDrawPresets(cfg.drawPresets || state.config.drawPresets);
        state.config.rareAnimations = normalizeRareAnimations(cfg.rareAnimations);
        reflectConfig();
        if(isAdmin()) clearActivePreset(); else clearSelectedPreset();
        markProfileDirty();
      }
      function shareLink(){ const cfg = compactConfig(); const json = JSON.stringify(cfg); const b = btoa(unescape(encodeURIComponent(json))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); const url = location.origin + location.pathname + '?cfg='+b; if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ alert('링크가 클립보드에 복사되었습니다.'); }).catch(function(){ prompt('아래 링크를 복사하세요', url); }); } else { prompt('아래 링크를 복사하세요', url); } }
      function readLink(){ const m = location.search.match(/[?&]cfg=([^&]+)/); if(!m) return; try{ const b = m[1].replace(/-/g,'+').replace(/_/g,'/'); const json = decodeURIComponent(escape(atob(b))); const cfg = JSON.parse(json); applyLoadedConfig(cfg); } catch(e){ console.warn('링크 파싱 실패', e); }
      }

      function ensurePetState(){
        if(!state.pets || typeof state.pets !== 'object'){
          state.pets = createDefaultPetState();
        }
        if(!state.pets.owned || typeof state.pets.owned !== 'object'){
          state.pets.owned = createDefaultPetState().owned;
        }
        return state.pets;
      }
      const CHARACTER_SKILL_INFO = Object.freeze({
        warrior: {
          title: '강철의 격타',
          summary: '강력한 일격으로 큰 피해를 주고 두꺼운 보호막을 전개합니다.',
          detail: '필살기 피해가 150%로 강화되며, 방어력의 240%만큼 피해를 흡수하는 보호막을 전개합니다.'
        },
        mage: {
          title: '마나 폭발',
          summary: '마법 폭발로 높은 피해를 주고 흡혈하며, 적의 방어를 크게 약화시킵니다.',
          detail: '공격력과 치명 피해에 비례한 강력한 피해를 주고, 피해의 35%만큼 체력을 회복하며 2턴 동안 적의 방어력을 35% 낮춥니다.'
        },
        archer: {
          title: '연속 사격',
          summary: '최대 3연타로 적을 사격하여 폭발적인 연속 피해를 노립니다.',
          detail: '1회당 75% 피해로 최대 3번 공격하며, 명중 시 누적 피해를 줍니다. 빗나간 횟수도 전투 로그에 표시됩니다.'
        },
        rogue: {
          title: '그림자 일격',
          summary: '출혈을 유발하는 암살 검으로 적을 지속적으로 괴롭힙니다.',
          detail: '피해를 주고 3턴 동안 매턴 공격력의 50%에 해당하는 출혈 피해를 부여합니다.'
        },
        goddess: {
          title: '여신의 심판',
          summary: '신성한 심판으로 피해와 함께 회복·보호막을 동시에 제공합니다.',
          detail: '공격력과 방어력에 비례한 피해를 준 뒤, 최대 체력의 28%를 회복하고 방어력의 200%만큼 보호막을 생성합니다.'
        }
      });

      const PLAYER_ULTIMATE_DEFAULT_CHANCE = 0.05;

      const CHARACTER_ULTIMATE_DATA = Object.freeze({
        warrior: [
          { minTier: 'SS+', name: '천룡 파쇄격', variant: 'warrior-ssplus' },
          { minTier: 'SSS+', name: '파멸의 낙뢰도', variant: 'warrior-sssplus' }
        ],
        mage: [
          { minTier: 'SS+', name: '마나 초신성', variant: 'mage-ssplus' },
          { minTier: 'SSS+', name: '라그나로크 오브', variant: 'mage-sssplus' }
        ],
        archer: [
          { minTier: 'SS+', name: '섬광의 연사', variant: 'archer-ssplus' },
          { minTier: 'SSS+', name: '운석 낙하 사격', variant: 'archer-sssplus' }
        ],
        rogue: [
          { minTier: 'SS+', name: '그림자 찌르기', variant: 'rogue-ssplus' },
          { minTier: 'SSS+', name: '혈월 난무', variant: 'rogue-sssplus' }
        ],
        goddess: [
          { minTier: 'S+', name: '천상의 축복', variant: 'goddess-splus' },
          { minTier: 'SS+', name: '시간의 기도', variant: 'goddess-ssplus' },
          { minTier: 'SSS+', name: '창세의 빛', variant: 'goddess-sssplus' }
        ]
      });

      const CHARACTER_ULTIMATE_INFO = Object.freeze({
        'warrior-ssplus': {
          summary: '공격력의 420% 피해를 입히고 2턴 동안 적 방어력을 35% 낮추며, 자신은 2턴 동안 피해 20% 감소.',
          detail: '천룡 파쇄격은 방어력 감소와 생존 버프를 동시에 제공하여 후속 딜을 강화합니다.'
        },
        'warrior-sssplus': {
          summary: '공격력의 550% 피해 + 적 현재 체력 15% 진실 피해, 방어력 45% 감소(2턴), 자신 피해 감소 30%(2턴).',
          detail: '파멸의 낙뢰도는 거대한 폭발 피해로 전투 흐름을 뒤집고, 강력한 방어 디버프와 생존 버프를 제공합니다.'
        },
        'mage-ssplus': {
          summary: '공격력의 380% 피해 후 3턴 동안 적이 받는 마법 피해 +25%, 자신 체력 25% 회복.',
          detail: '마나 초신성은 마법 취약을 부여해 동료의 마법 피해를 강화하고, 안정적인 회복을 제공합니다.'
        },
        'mage-sssplus': {
          summary: '공격력의 520% 피해 + 적 현재 체력 12% 진실 피해, 마법 피해 +40%(3턴), 스킬 쿨다운 1턴 감소.',
          detail: '라그나로크 오브는 폭발적인 피해와 함께 적을 취약하게 만들고, 자신의 다음 스킬 사용을 앞당깁니다.'
        },
        'archer-ssplus': {
          summary: '5연속 사격(각 80% 피해). 치명 시 적 명중률 10% 감소(1턴).',
          detail: '섬광의 연사는 빠른 연속 공격으로 적을 무력화하고 명중률을 떨어뜨립니다.'
        },
        'archer-sssplus': {
          summary: '7연속 사격(각 90% 피해). 치명 시 명중률 15% 감소(2턴), 모두 명중 시 스킬 쿨다운 1턴 감소.',
          detail: '운석 낙하 사격은 다단히트로 피해를 누적시키고, 모든 화살을 적중시키면 추가 행동 기회를 제공합니다.'
        },
        'rogue-ssplus': {
          summary: '공격력의 300% 피해 + 3턴 출혈(공격력 90%), 자신 회피 20%(1턴).',
          detail: '그림자 찌르기는 빠른 공격과 출혈로 적을 괴롭히고, 회피 버프로 반격을 피합니다.'
        },
        'rogue-sssplus': {
          summary: '2연속 240% 피해(치명률 +30%) 후 4턴 출혈(공격력 120%), 회피 25%·속도 +15 (2턴).',
          detail: '혈월 난무는 암살자의 진수를 보여 주며, 전투 템포를 장악합니다.'
        },
        'goddess-splus': {
          summary: '체력 40% 회복, 2턴 동안 공격·방어 +25%, 성속성 피해 280%.',
          detail: '천상의 축복은 파티를 회복하고 강화하며, 신성한 낙뢰로 적을 공격합니다.'
        },
        'goddess-ssplus': {
          summary: '체력 50% 회복 + 보호막 생성, 적 1턴 시간정지, 스킬 쿨다운 초기화, 성속성 피해 320%.',
          detail: '시간의 기도는 적을 멈추고 아군을 완벽히 지켜 주며, 다시 공격할 준비를 갖춥니다.'
        },
        'goddess-sssplus': {
          summary: '체력 완전 회복 + 아군 전원 부활/회복, 공격·방어·속도 +35%(3턴), 성속성 피해 650% + 진실 피해 20%, 적 받는 피해 +30%(2턴).',
          detail: '창세의 빛은 전투당 한 번 모든 것을 되돌리는 궁극기입니다. 전열을 재정비하고 적을 말 그대로 태워 버립니다.'
        }
      });

      function ensureCharacterState(){
        if(!state.characters || typeof state.characters !== 'object'){
          state.characters = createDefaultCharacterState();
        }
        if(!state.characters.owned || typeof state.characters.owned !== 'object'){
          state.characters.owned = createDefaultCharacterState().owned;
        }
        if(!state.characters.enhancements || typeof state.characters.enhancements !== 'object'){
          const defaults = createDefaultCharacterState().enhancements;
          state.characters.enhancements = {};
          CHARACTER_IDS.forEach((id)=>{
            state.characters.enhancements[id] = { level: defaults[id]?.level || 0, progress: defaults[id]?.progress || 0 };
          });
        }
        CHARACTER_IDS.forEach((id) => {
          if(typeof state.characters.owned[id] !== 'number' || !isFinite(state.characters.owned[id])){
            state.characters.owned[id] = 0;
          }
          const enh = state.characters.enhancements[id];
          const level = clampEnhancementLevel(enh?.level || 0);
          const progress = clampEnhancementProgress(level, enh?.progress || 0);
          state.characters.enhancements[id] = { level, progress };
        });
        if(DEFAULT_CHARACTER_ID && (state.characters.owned[DEFAULT_CHARACTER_ID] || 0) <= 0){
          state.characters.owned[DEFAULT_CHARACTER_ID] = 1;
        }
        if(!state.characters.active || !CHARACTER_IDS.includes(state.characters.active) || (state.characters.owned[state.characters.active] || 0) <= 0){
          state.characters.active = DEFAULT_CHARACTER_ID || CHARACTER_IDS[0];
        }
        return state.characters;
      }

      function characterEnhancementState(characterId){
        const chars = ensureCharacterState();
        if(!CHARACTER_IDS.includes(characterId)){
          return { level: 0, progress: 0, next: getEnhancementRequirement(0), multiplier: 1, isMax: false, available: 0 };
        }
        const entry = chars.enhancements?.[characterId] || { level: 0, progress: 0 };
        const level = clampEnhancementLevel(entry.level || 0);
        const progress = clampEnhancementProgress(level, entry.progress || 0);
        const next = getEnhancementRequirement(level);
        const available = Math.max(0, (chars.owned?.[characterId] || 0) - 1);
        return {
          level,
          progress,
          next,
          multiplier: getEnhancementMultiplier(level),
          isMax: !next,
          available
        };
      }
      function consumeCharacterDuplicates(characterId, amount){ const chars = ensureCharacterState(); if(!CHARACTER_IDS.includes(characterId)) return { consumed: 0, levelBefore: 0, levelAfter: 0, progressBefore: 0, progressAfter: 0, isMax: true }; amount = Math.max(0, Math.floor(amount||0)); const owned = chars.owned?.[characterId] || 0; const available = Math.max(0, owned - 1); if(amount <= 0 || available <= 0){ const entry = chars.enhancements?.[characterId] || { level:0, progress:0 }; const level = clampEnhancementLevel(entry.level || 0); const prog = clampEnhancementProgress(level, entry.progress || 0); return { consumed: 0, levelBefore: level, levelAfter: level, progressBefore: prog, progressAfter: prog, isMax: !getEnhancementRequirement(level) }; } const entry = chars.enhancements?.[characterId] || { level:0, progress:0 }; let level = clampEnhancementLevel(entry.level || 0); let progress = clampEnhancementProgress(level, entry.progress || 0); let remaining = Math.min(amount, available); let consumed = 0; const levelBefore = level; const progressBefore = progress; while(remaining > 0 && level < MAX_ENHANCEMENT_LEVEL){ const req = getEnhancementRequirement(level); if(!req) break; const need = req.cost - progress; const use = Math.min(remaining, need); if(use <= 0) break; progress += use; remaining -= use; consumed += use; if(progress >= req.cost){ level += 1; progress = 0; } }
        if(consumed > 0){ chars.owned[characterId] = Math.max(1, chars.owned[characterId] - consumed); chars.enhancements[characterId] = { level, progress }; }
        return { consumed, levelBefore, levelAfter: level, progressBefore, progressAfter: progress, isMax: !getEnhancementRequirement(level) };
      }
      function performCharacterEnhancement(characterId, opts){ opts = opts||{}; const consumeAll = !!opts.consumeAll; const info = characterEnhancementState(characterId); if(info.isMax){ return { status:'max' }; } const available = info.available; if(available <= 0){ return { status:'no-dup' }; } const targetUse = info.next ? Math.max(1, info.next.cost - info.progress) : 0; const use = consumeAll ? available : Math.min(available, targetUse); const result = consumeCharacterDuplicates(characterId, use); if(result.consumed <= 0){ return { status:'no-dup' }; } const chars = ensureCharacterState(); if(userProfile){ userProfile.characters = chars; } markProfileDirty(); updateCharacterList(); updateInventoryView(); return { status: result.levelAfter > result.levelBefore ? 'level-up' : 'progress', result }; }

      function getActiveCharacterId(){
        const chars = ensureCharacterState();
        return chars.active || DEFAULT_CHARACTER_ID;
      }

      function getActiveCharacterDefinition(){
        const id = getActiveCharacterId();
        return id ? getCharacterDefinition(id) : null;
      }

      function getActiveCharacterBaseStats(){
        const def = getActiveCharacterDefinition();
        const base = def && def.stats ? { ...def.stats } : { atk: 0, def: 0, hp: 5000, critRate: 5, critDmg: 150, dodge: 5, speed: 100 };
        const chars = ensureCharacterState();
        const activeId = getActiveCharacterId();
        const enh = chars.enhancements?.[activeId] || null;
        const level = enh ? clampEnhancementLevel(enh.level || 0) : 0;
        const multiplier = getEnhancementMultiplier(level);
        if(multiplier !== 1){
          Object.keys(base).forEach((key)=>{
            const value = base[key];
            if(typeof value === 'number' && isFinite(value)){
              base[key] = value * multiplier;
            }
          });
        }
        return base;
      }

      function characterTierAtLeast(tier, minTier){
        const current = TIER_INDEX[tier];
        const required = TIER_INDEX[minTier];
        if(current === undefined || required === undefined) return false;
        return current <= required;
      }

      function randomCharacterIdForTier(tier, rng){
        const pool = (CHARACTER_IDS_BY_TIER[tier] || []).slice();
        if(pool.length === 0){
          return DEFAULT_CHARACTER_ID || CHARACTER_IDS[0];
        }
        const index = Math.floor(rng() * pool.length);
        return pool[Math.max(0, Math.min(pool.length - 1, index))];
      }

      function getCharacterSkillInfo(def){ if(!def) return null; return CHARACTER_SKILL_INFO[def.classId] || null; }
      function getCharacterSkillDescription(def){ const info = getCharacterSkillInfo(def); return info ? `${info.title}: ${info.summary}` : ''; }
      function getCharacterUltimateDefinition(def){
        if(!def) return null;
        const entries = CHARACTER_ULTIMATE_DATA[def.classId];
        if(!entries) return null;
        let matched = null;
        entries.forEach((entry) => {
          if(characterTierAtLeast(def.tier, entry.minTier)){
            matched = entry;
          }
        });
        if(!matched) return null;
        return {
          name: matched.name,
          variant: matched.variant,
          chance: PLAYER_ULTIMATE_DEFAULT_CHANCE,
          oncePerBattle: true
        };
      }
      function getCharacterUltimateInfo(ultimateDef){ if(!ultimateDef) return null; return CHARACTER_ULTIMATE_INFO[ultimateDef.variant] || null; }

      function formatUltimateChance(ultimateDef){ const chance = typeof ultimateDef?.chance === 'number' ? ultimateDef.chance : PLAYER_ULTIMATE_DEFAULT_CHANCE; const pct = (chance * 100).toFixed(1); return pct.endsWith('.0') ? `${pct.slice(0, -2)}%` : `${pct}%`; }

      function buildCharacterDetailContent(def){ if(!def){ return '<p class="muted">캐릭터를 선택하면 상세 정보를 확인할 수 있습니다.</p>'; }
        const characters = ensureCharacterState();
        const owned = characters.owned?.[def.id] || 0;
        const enh = characterEnhancementState(def.id);
        const showDetails = isAdmin();
        const skillInfo = getCharacterSkillInfo(def);
        const ultimateDef = getCharacterUltimateDefinition(def);
        const ultimateInfo = getCharacterUltimateInfo(ultimateDef);

        const statEntries = [
          { key:'hp', label:'HP', type:'flat' },
          { key:'atk', label:'공격력', type:'flat' },
          { key:'def', label:'방어력', type:'flat' },
          { key:'critRate', label:'치명타율', type:'percent' },
          { key:'critDmg', label:'치명타 피해', type:'percent' },
          { key:'dodge', label:'회피율', type:'percent' },
          { key:'speed', label:'속도', type:'flat' }
        ];

        // 실제 전투 스탯 계산 (강화 전 - characterEnhancementLevel = 0)
        const baseStats = def.stats || {};
        const activePetId = ensurePetState().active || null;
        const balanceConfig = ensureCharacterBalanceConfig();

        const baseResult = deriveCombatStats(
          state.equip || {},
          state.enhance,
          baseStats,
          activePetId,
          {
            balance: balanceConfig,
            characterId: def.id,
            classId: def.classId,
            character: def,
            characterEnhancementLevel: 0
          }
        );

        // 실제 전투 스탯 계산 (강화 후 - 현재 강화 레벨)
        const enhancedResult = deriveCombatStats(
          state.equip || {},
          state.enhance,
          baseStats,
          activePetId,
          {
            balance: balanceConfig,
            characterId: def.id,
            classId: def.classId,
            character: def,
            characterEnhancementLevel: enh.level
          }
        );

        const balancedStats = baseResult.stats;
        const enhancedStats = enhancedResult.stats;
        const enhancementMultiplier = enh.multiplier || 1;

        // 기본 스탯 HTML (강화 전)
        const baseStatHtml = statEntries.map(({ key, label, type }) => {
          const value = balancedStats[key] || 0;
          const text = type === 'percent' ? `${Math.round(value)}%` : formatNum(Math.round(value));
          return `<span><span class="stat-label">${label}</span>${text}</span>`;
        }).join('');

        // 강화된 스탯 HTML (강화 후)
        const enhancedStatHtml = enh.level > 0 ? statEntries.map(({ key, label, type }) => {
          const baseValue = balancedStats[key] || 0;
          const enhancedValue = enhancedStats[key] || 0;
          const text = type === 'percent' ? `${Math.round(enhancedValue)}%` : formatNum(Math.round(enhancedValue));
          const increase = enhancedValue - baseValue;
          const increaseText = increase > 0 ? ` (+${type === 'percent' ? Math.round(increase) + '%' : formatNum(Math.round(increase))})` : '';
          return `<span><span class="stat-label">${label}</span><strong>${text}</strong>${increaseText}</span>`;
        }).join('') : '';

        const ownedText = isAdmin() ? '∞' : formatNum(owned);
        const sections = [];
        sections.push(`
          <div class="detail-header">
            <div>
              <div class="detail-title" id="characterDetailTitle">${def.name || def.id}</div>
              <div class="detail-tier">${def.tier || '-'} · ${def.className || def.classId || ''}</div>
            </div>
            <div class="detail-owned muted">보유: <b>${ownedText}</b></div>
          </div>
        `);

        // 강화 정보 섹션
        if(enh.level > 0){
          sections.push(`
            <div class="detail-section enhancement-info">
              <h4>강화 정보</h4>
              <div class="muted">
                <p>강화 레벨: <strong>Lv.${enh.level}</strong> (배율: <strong>${formatMultiplier(enhancementMultiplier)}×</strong>)</p>
                <p>진행도: ${enh.progress}/${enh.next?.cost || 0} · 사용 가능 중복: ${formatNum(enh.available)}</p>
                ${enh.isMax ? '<p class="success"><strong>✨ 최대 강화 달성!</strong></p>' : ''}
              </div>
            </div>
          `);
        }

        sections.push(`
          <div class="detail-section">
            <h4>기본 능력치 ${enh.level > 0 ? '(강화 전)' : ''}</h4>
            <div class="stat-list">${baseStatHtml}</div>
          </div>
        `);

        if(enh.level > 0){
          sections.push(`
            <div class="detail-section">
              <h4>강화된 능력치 <span class="success">(Lv.${enh.level})</span></h4>
              <div class="stat-list enhanced">${enhancedStatHtml}</div>
            </div>
          `);
        }
        if(skillInfo){
          sections.push(`
            <div class="detail-section">
              <h4>직업 스킬 — ${skillInfo.title}</h4>
              <p>${skillInfo.summary}</p>
              ${skillInfo.detail ? `<p class="muted">${skillInfo.detail}</p>` : ''}
            </div>
          `);
        }
        if(ultimateDef){
          const chanceText = formatUltimateChance(ultimateDef);
          const ultimateSummary = ultimateInfo?.summary || '발동 시 강력한 필살기가 전개됩니다.';
          const ultimateDetail = ultimateInfo?.detail ? `<p class="muted">${ultimateInfo.detail}</p>` : '';
          const onceText = ultimateDef.oncePerBattle === false ? '' : ' · 전투당 1회';
          sections.push(`
            <div class="detail-section">
              <h4>필살기 — ${ultimateDef.name}</h4>
              <p>발동 확률 ${chanceText}${onceText}</p>
              <p>${ultimateSummary}</p>
              ${ultimateDetail}
            </div>
          `);
        }
        return sections.join('');
      }

      function openCharacterDetail(def){ if(!els.characterDetailModal || !els.characterDetailBody) return; const content = buildCharacterDetailContent(def); els.characterDetailBody.innerHTML = content; els.characterDetailBody.scrollTop = 0; els.characterDetailModal.hidden = false; requestAnimationFrame(()=>{ els.characterDetailModal.classList.add('show'); }); state.ui.characterDetailOpen = true; }

      function closeCharacterDetail(){ if(!els.characterDetailModal) return; els.characterDetailModal.classList.remove('show'); state.ui.characterDetailOpen = false; setTimeout(()=>{ if(!state.ui.characterDetailOpen && els.characterDetailModal) els.characterDetailModal.hidden = true; }, 200); }

      function selectCharacterDetail(characterId){ if(!CHARACTER_IDS.includes(characterId)) return; state.ui.selectedCharacterDetail = characterId; updateCharacterDetailSelection(); openCharacterDetail(getCharacterDefinition(characterId)); }

      function updateCharacterDetailSelection(){ if(!els.characterList) return; const selectedId = state.ui.selectedCharacterDetail || getActiveCharacterId(); const cards = els.characterList.querySelectorAll('.character-card'); cards.forEach((card) => { card.classList.toggle('selected', card.dataset.character === selectedId); }); if(state.ui.characterDetailOpen && els.characterDetailBody){ els.characterDetailBody.innerHTML = buildCharacterDetailContent(getCharacterDefinition(selectedId)); } }

      function clampCurrencyValue(value){ return clampNumber(value, 0, Number.MAX_SAFE_INTEGER, 0); }

      function loadWallet(){
        if(isAdmin()){
          state.wallet = Number.POSITIVE_INFINITY;
          updatePointsView();
          return;
        }
        const stored = (userProfile && typeof userProfile.wallet === 'number' && isFinite(userProfile.wallet)) ? userProfile.wallet : null;
        if(stored !== null){
          state.wallet = clampCurrencyValue(stored);
          userProfile.wallet = state.wallet;
          if(state.profile) state.profile.wallet = state.wallet;
        } else {
          state.wallet = 1000;
          saveWallet({ force: true, silent: true });
        }
        updatePointsView();
      }
      function saveWallet(opts){
        if(isAdmin()) return;
        if(!userProfile) return;
        const coerced = clampCurrencyValue(state.wallet);
        state.wallet = coerced;
        const prev = typeof userProfile.wallet === 'number' && isFinite(userProfile.wallet) ? userProfile.wallet : null;
        userProfile.wallet = coerced;
        if(state.profile) state.profile.wallet = coerced;
        if(opts?.force || prev !== coerced){
          markProfileDirty();
        }
        if(!opts || !opts.silent) updatePointsView();
      }
      function updatePointsView(){ if(els.points) els.points.textContent = isAdmin()? '∞' : formatNum(state.wallet||0); updateDrawButtons(); updateReviveButton(); }
      function updateDrawButtons(){
        const running = !!state.inRun;
        const blocked = !!state.ui.rareAnimationBlocking;
        const mode = state.ui.gachaMode || 'gear';
        const wallet = isAdmin() ? Number.POSITIVE_INFINITY : (state.wallet || 0);
        const petTickets = state.items.petTicket || 0;
        getGearPresets().forEach((preset)=>{
          const btn = els[preset.id];
          if(!btn) return;
          const affordable = isAdmin() || wallet >= preset.totalCost;
          btn.disabled = mode !== 'gear' || running || blocked || !affordable;
        });
        getCharacterPresets().forEach((preset)=>{
          const btn = els[preset.id];
          if(!btn) return;
          const affordable = isAdmin() || wallet >= preset.totalCost;
          btn.disabled = mode !== 'character' || running || blocked || !affordable;
        });
        if(els.drawPet1) els.drawPet1.disabled = mode !== 'pet' || running || blocked || (!isAdmin() && petTickets < 1);
        if(els.drawPet10) els.drawPet10.disabled = mode !== 'pet' || running || blocked || (!isAdmin() && petTickets < 10);
      }
      function canSpend(amt){ if(isAdmin()) return true; return state.wallet >= amt; }
      function spendPoints(amt){ if(isAdmin()) return true; if(state.wallet < amt) return false; state.wallet -= amt; saveWallet(); return true; }
      function addPoints(amt){ if(isAdmin()) return; state.wallet += amt; saveWallet(); }

      function loadGold(){
        if(isAdmin()){
          state.gold = Number.POSITIVE_INFINITY;
          updateGoldView();
          return;
        }
        const stored = (userProfile && typeof userProfile.gold === 'number' && isFinite(userProfile.gold)) ? userProfile.gold : null;
        if(stored !== null){
          state.gold = clampCurrencyValue(stored);
          userProfile.gold = state.gold;
          if(state.profile) state.profile.gold = state.gold;
        } else {
          state.gold = 10000;
          saveGold({ force: true, silent: true });
        }
        updateGoldView();
      }
      function saveGold(opts){
        if(isAdmin()) return;
        if(!userProfile) return;
        const coerced = clampCurrencyValue(state.gold);
        state.gold = coerced;
        const prev = typeof userProfile.gold === 'number' && isFinite(userProfile.gold) ? userProfile.gold : null;
        userProfile.gold = coerced;
        if(state.profile) state.profile.gold = coerced;
        const hasExtraUpdates = !!(opts?.extraUpdates && Object.keys(opts.extraUpdates).length);
        if(hasExtraUpdates){
          queueProfileExtras(opts.extraUpdates);
        }
        if(opts?.force || prev !== coerced || hasExtraUpdates){
          markProfileDirty();
        }
        if(!opts || !opts.silent) updateGoldView();
      }
      function updateGoldView(){ if(els.gold){ if(isAdmin()){ els.gold.textContent = '∞'; } else { els.gold.textContent = formatNum(state.gold||0); } } updateShopButtons(); }
      function addGold(amount){ if(!(amount>0)) return; state.gold = (state.gold||0) + Math.floor(amount); saveGold(); }
      function spendGold(amount, opts){ amount = Math.floor(amount); if(!(amount>0)) return false; if((state.gold||0) < amount) return false; state.gold -= amount; if(opts?.deferSave) return true; saveGold(opts); return true; }

      function loadDiamonds(){
        if(isAdmin()){
          state.diamonds = Number.POSITIVE_INFINITY;
          updateDiamondsView();
          return;
        }
        const stored = (userProfile && typeof userProfile.diamonds === 'number' && isFinite(userProfile.diamonds)) ? userProfile.diamonds : null;
        if(stored !== null){
          state.diamonds = clampCurrencyValue(stored);
          userProfile.diamonds = state.diamonds;
          if(state.profile) state.profile.diamonds = state.diamonds;
        } else {
          state.diamonds = 0;
          saveDiamonds({ force: true, silent: true });
        }
        updateDiamondsView();
      }
      function saveDiamonds(opts){
        if(isAdmin()) return;
        if(!userProfile) return;
        const coerced = clampCurrencyValue(state.diamonds);
        state.diamonds = coerced;
        const prev = typeof userProfile.diamonds === 'number' && isFinite(userProfile.diamonds) ? userProfile.diamonds : null;
        userProfile.diamonds = coerced;
        if(state.profile) state.profile.diamonds = coerced;
        if(opts?.force || prev !== coerced){
          markProfileDirty();
        }
        if(!opts || !opts.silent) updateDiamondsView();
      }
      function updateDiamondsView(){ if(els.diamonds){ els.diamonds.textContent = isAdmin()? '∞' : formatNum(state.diamonds||0); } updateShopButtons(); }
      function addDiamonds(amount){ amount = Math.floor(amount); if(!amount || isNaN(amount)) return; if(isAdmin()) return; state.diamonds = Math.max(0, (state.diamonds || 0) + amount); saveDiamonds(); }
      function spendDiamonds(amount){ amount = Math.floor(amount); if(!(amount>0)) return false; if(isAdmin()) return true; if((state.diamonds||0) < amount) return false; state.diamonds -= amount; saveDiamonds(); return true; }

      function updateItemCountsView(){ const items = state.items || {}; const f = (value)=> formatNum(value || 0);
        setTextContent(els.petTicketCount, f(items.petTicket));
        setTextContent(els.petTicketInline, f(items.petTicket));
        setTextContent(els.holyWaterCount, f(items.holyWater));
        setTextContent(els.potionCount, f(items.potion));
        setTextContent(els.hyperPotionCount, f(items.hyperPotion));
        setTextContent(els.protectCount, f(items.protect));
        setTextContent(els.enhanceCount, f(items.enhance));
        setTextContent(els.battleResCount, f(items.battleRes));
        setTextContent(els.battleResRemain, f(items.battleRes));
        setTextContent(els.battleResInline, f(items.battleRes));
        setTextContent(els.invPotion, f(items.potion));
        setTextContent(els.invHyper, f(items.hyperPotion));
        setTextContent(els.invProtect, f(items.protect));
        setTextContent(els.invEnhance, f(items.enhance));
        setTextContent(els.invBattleRes, f(items.battleRes));
        setTextContent(els.invHolyWater, f(items.holyWater));
        setTextContent(els.reviveCount, f(items.revive));
      }

      function updateBattleResControls(){ if(!els.battleResUse) return; const admin = isAdmin(); const items = state.items || {}; const available = admin ? Number.POSITIVE_INFINITY : (items.battleRes || 0); const enabled = admin || (state.combat.useBattleRes && available > 0);
        els.battleResUse.checked = state.combat.useBattleRes && available > 0;
        if(els.battleResInline) els.battleResInline.textContent = formatNum(available);
        if(els.battleResCount) els.battleResCount.textContent = formatNum(available);
        els.battleResUse.disabled = !admin && available <= 0;
        if(els.battleResToggle) els.battleResToggle.classList.toggle('disabled', !enabled);
      }

      function shopPrice(type){ const prices = state.config.shopPrices || DEFAULT_SHOP_PRICES; const val = Object.prototype.hasOwnProperty.call(prices, type) ? prices[type] : DEFAULT_SHOP_PRICES[type]; return Math.max(0, Math.floor(val)); }
      function updateShopButtons(){ if(!els.shopPanel) return; if(els.pricePotion) els.pricePotion.textContent = formatNum(shopPrice('potion')); if(els.priceHyper) els.priceHyper.textContent = formatNum(shopPrice('hyperPotion')); if(els.priceProtect) els.priceProtect.textContent = formatNum(shopPrice('protect')); if(els.priceEnhance) els.priceEnhance.textContent = formatNum(shopPrice('enhance')); if(els.priceBattleRes) els.priceBattleRes.textContent = formatNum(shopPrice('battleRes')); if(els.priceHolyWater) els.priceHolyWater.textContent = formatNum(shopPrice('holyWater')); if(els.priceStarter) els.priceStarter.textContent = formatNum(shopPrice('starterPack'));
        const gold = state.gold===Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : (state.gold||0);
        const buttons = els.shopPanel.querySelectorAll('.shop-buy');
        buttons.forEach(function(btn){ const type = btn.dataset.item; if(!type) return; const cnt = parseInt(btn.dataset.count||'1',10) || 1; const cost = shopPrice(type) * cnt; btn.disabled = gold !== Number.POSITIVE_INFINITY && cost > gold; });
        const diamonds = state.diamonds === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : (state.diamonds || 0);
        const diamondButtons = els.shopPanel.querySelectorAll('.diamond-pack-buy');
        diamondButtons.forEach((btn)=>{ const packId = btn.dataset.pack || btn.closest('[data-pack-id]')?.dataset.packId; const pack = findDiamondPack(packId); if(!pack){ btn.disabled = true; return; } btn.disabled = diamonds !== Number.POSITIVE_INFINITY && pack.diamonds > diamonds; });
      }
      function applyStatusClass(target, text, tone){ if(!target) return; target.textContent = text || ''; target.classList.remove('ok','warn','error','danger'); if(!tone) return; const mapped = tone === 'error' ? 'error' : tone; target.classList.add(mapped); }
      function setAdminMsg(text, tone){ applyStatusClass(els.adminMsg, text, tone); }
      function setMonsterDifficultyStatus(text, tone){ applyStatusClass(els.monsterDifficultyStatus, text, tone); }
      function setDrawMessage(text, tone){ applyStatusClass(els.drawMsg, text, tone); }
      function setAdminPresetMsg(text, tone){ applyStatusClass(els.presetAdminMsg, text, tone); }
      function setPresetMsg(text, tone){ applyStatusClass(els.presetMsg, text, tone); }
      function setShopMessage(msg, status){ applyStatusClass(els.shopMsg, msg, status); }
      function renderDiamondShop(){ if(!els.diamondShopGrid) return; const grid = els.diamondShopGrid; grid.textContent = ''; const frag = document.createDocumentFragment(); DIAMOND_SHOP_PACKS.forEach((pack)=>{ const card = document.createElement('div'); card.className = 'diamond-pack'; card.dataset.packId = pack.id; card.innerHTML = `
          <div class="diamond-pack__title">${pack.label}</div>
          <div class="diamond-pack__cost">💎 ${formatNum(pack.diamonds)}</div>
          <div class="diamond-pack__reward">포인트 ${formatNum(pack.points)}</div>
          <div class="diamond-pack__reward">골드 ${formatNum(pack.gold)}</div>
          ${pack.bonus ? `<div class="diamond-pack__bonus">${pack.bonus}</div>` : ''}
          <button type="button" class="diamond-pack__buy diamond-pack-buy" data-pack="${pack.id}">구매</button>`; frag.appendChild(card); }); grid.appendChild(frag); if(els.diamondShop){ els.diamondShop.hidden = DIAMOND_SHOP_PACKS.length === 0; } updateShopButtons(); }
      function findDiamondPack(id){ return id ? (DIAMOND_PACK_LOOKUP[id] || null) : null; }
      function buyDiamondPack(packId){ const pack = findDiamondPack(packId); if(!pack){ setShopMessage('알 수 없는 다이아 상품입니다.', 'warn'); return; } if(!spendDiamonds(pack.diamonds)){ setShopMessage('다이아가 부족합니다.', 'error'); updateShopButtons(); return; } if(pack.points > 0){ addPoints(pack.points); }
        if(pack.gold > 0){ addGold(pack.gold); }
        setShopMessage(`💎 ${formatNum(pack.diamonds)} 다이아 사용! 포인트 ${formatNum(pack.points)}, 골드 ${formatNum(pack.gold)}를 획득했습니다.`, 'ok');
        updateShopButtons();
        markProfileDirty();
      }
      function onShopClick(e){ const target = e.target; if(!(target instanceof HTMLButtonElement)) return; if(target.classList.contains('diamond-pack-buy')){ const packId = target.dataset.pack || target.closest('[data-pack-id]')?.dataset.packId; if(packId){ buyDiamondPack(packId); } return; } if(!target.classList.contains('shop-buy')) return; const item = target.dataset.item; const count = parseInt(target.dataset.count||'1',10) || 1; if(item) buyShopItem(item, count); }
      function grantStarterPack(count){ count = Math.max(1, parseInt(count,10)||1); const rng = getRng(); for(let n=0;n<count;n++){ PART_DEFS.forEach(function(part){ const item = { id: state.itemSeq++, tier: 'B', part: part.key, base: rollStatFor('B', part.key, rng), lvl: 0, type: part.type }; applyEquipAndInventory(item); }); } updateInventoryView(); }
      function buyShopItem(type, count){
        count = Math.max(1, parseInt(count,10)||1);
        const totalCost = shopPrice(type) * count;
        if(state.gold !== Number.POSITIVE_INFINITY && (state.gold||0) < totalCost){ setShopMessage('골드가 부족합니다.', 'error'); return; }
        if(!spendGold(totalCost, { deferSave:true })){ setShopMessage('골드 차감에 실패했습니다.', 'error'); return; }
        switch(type){
          case 'potion':
            state.items.potion = (state.items.potion||0) + count;
            setShopMessage(`가속 물약 ${count}개를 구매했습니다.`, 'ok');
            break;
          case 'hyperPotion':
            state.items.hyperPotion = (state.items.hyperPotion||0) + count;
            setShopMessage(`초 가속 물약 ${count}개를 구매했습니다.`, 'ok');
            break;
          case 'protect':
            state.items.protect = (state.items.protect||0) + count;
            setShopMessage(`보호권 ${count}개를 구매했습니다.`, 'ok');
            break;
          case 'enhance':
            state.items.enhance = (state.items.enhance||0) + count;
            setShopMessage(`강화권 ${count}개를 구매했습니다.`, 'ok');
            break;
          case 'battleRes':
            state.items.battleRes = (state.items.battleRes||0) + count;
            setShopMessage(`전투부활권 ${count}개를 구매했습니다.`, 'ok');
            break;
          case 'holyWater':
            state.items.holyWater = (state.items.holyWater||0) + count;
            setShopMessage(`성수 ${count}개를 구매했습니다.`, 'ok');
            break;
          case 'starterPack':
            grantStarterPack(count);
            setShopMessage(`초보자 패키지를 구매했습니다! B 등급 장비 ${count*PART_KEYS.length}개를 획득했습니다.`, 'ok');
            markQuestCompleted('starterPackPurchase');
            break;
          default:
            setShopMessage('알 수 없는 아이템입니다.', 'warn');
            addGold(totalCost);
            return;
        }
        const itemsPayload = sanitizeItems(state.items);
        state.items = itemsPayload;
        if(userProfile){ userProfile.items = { ...itemsPayload }; }
        if(state.profile){ state.profile.items = { ...itemsPayload }; }
        if(!isAdmin()){
          saveGold({ extraUpdates: { items: itemsPayload } });
        }
        updateItemCountsView();
        markProfileDirty();
      }
      function canClaimRevive(){ if(isAdmin()) return false; if(totalKept() !== 0) return false; if((state.wallet||0) > 100) return false; return true; }
      function updateReviveButton(){ if(!els.claimRevive) return; const show = canClaimRevive(); els.claimRevive.style.display = show ? '' : 'none'; els.claimRevive.disabled = !show; }
      function claimRevive(){ if(!canClaimRevive()){ alert('부활권을 받을 조건이 아닙니다. (장비 0개, 포인트 100 이하 필요)'); return; } state.items.revive = (state.items.revive||0) + 1; addPoints(1000); updateItemCountsView(); updateReviveButton(); markProfileDirty(); alert('부활권을 획득하고 1,000 포인트를 받았습니다!'); }

      // Quest helpers
      let questToastTimer = null;

      function ensureQuestState(){
        state.quests = sanitizeQuestState(state.quests);
        return state.quests;
      }

      function ensureQuestStatus(questId){
        const quests = ensureQuestState();
        if(!quests.statuses[questId]){
          quests.statuses[questId] = {
            completed: false,
            rewardGranted: false,
            completedAt: null,
            rewardAt: null
          };
        }
        return quests.statuses[questId];
      }

      function showQuestToast(message){
        if(!els.questToast || !message) return;
        els.questToast.textContent = message;
        els.questToast.classList.add('show');
        if(questToastTimer){
          clearTimeout(questToastTimer);
        }
        questToastTimer = setTimeout(()=>{
          if(els.questToast){
            els.questToast.classList.remove('show');
          }
          questToastTimer = null;
        }, 3200);
      }

      function refreshQuestBadge(){
        if(!els.questBadge) return;
        const quests = ensureQuestState();
        let readyToClaim = 0;
        QUEST_DEFINITIONS.forEach((quest)=>{
          const status = quests.statuses[quest.id];
          if(status && status.completed && !status.rewardGranted){
            readyToClaim++;
          }
        });
        if(readyToClaim > 0){
          els.questBadge.textContent = String(readyToClaim);
          els.questBadge.hidden = false;
        } else {
          els.questBadge.hidden = true;
        }
      }

      function renderQuestItem(quest, status){
        const container = document.createElement('div');
        container.className = 'quest-item';
        container.setAttribute('role', 'listitem');

        const header = document.createElement('div');
        header.className = 'quest-item__header';
        const title = document.createElement('div');
        title.className = 'quest-item__title';
        title.textContent = quest.title;
        const badge = document.createElement('span');
        badge.className = 'quest-item__status';
        if(status.rewardGranted){
          badge.textContent = '완료';
          badge.dataset.status = 'done';
        } else if(status.completed){
          badge.textContent = '보상 지급 대기';
          badge.dataset.status = 'pending';
        } else {
          badge.textContent = '진행 중';
          badge.dataset.status = 'active';
        }
        header.appendChild(title);
        header.appendChild(badge);

        const desc = document.createElement('p');
        desc.className = 'quest-item__desc';
        desc.textContent = quest.description;

        const reward = document.createElement('div');
        reward.className = 'quest-item__reward';
        reward.textContent = `보상: ${quest.rewardLabel || questRewardSummary(quest)}`;

        const actions = document.createElement('div');
        actions.className = 'quest-item__actions';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quest-claim';
        button.dataset.questId = quest.id;
        if(status.rewardGranted){
          button.textContent = '보상 수령 완료';
          button.disabled = true;
        } else if(status.completed){
          button.textContent = '보상 받기';
          button.disabled = false;
        } else {
          button.textContent = '미완료';
          button.disabled = true;
        }
        actions.appendChild(button);

        container.appendChild(header);
        container.appendChild(desc);
        container.appendChild(reward);
        container.appendChild(actions);
        return container;
      }

      function refreshQuestView(){
        refreshQuestBadge();
        if(!els.questList) return;
        els.questList.innerHTML='';
        let pendingClaims = 0;
        QUEST_DEFINITIONS.forEach((quest)=>{
          const status = ensureQuestStatus(quest.id);
          const node = renderQuestItem(quest, status);
          els.questList.appendChild(node);
          if(status.completed && !status.rewardGranted){ pendingClaims++; }
        });
        if(els.questEmpty){
          els.questEmpty.hidden = pendingClaims !== 0;
        }
      }

      function commitQuestState(options){
        const sanitized = sanitizeQuestState(state.quests);
        state.quests = sanitized;
        if(userProfile){ userProfile.quests = sanitized; }
        if(state.profile){ state.profile.quests = sanitized; }
        if(options?.skipDirty !== true){
          markProfileDirty();
        }
        if(options?.refreshList === false){
          refreshQuestBadge();
        } else {
          refreshQuestView();
        }
      }

      async function grantQuestReward(quest){
        if(!quest) return null;
        if(isAdmin()) return null;
        if(quest.delivery === 'mail'){
          const uid = currentFirebaseUser?.uid;
          if(!uid){
            throw new Error('사용자 정보가 없습니다.');
          }
          const mailPayload = {
            title: quest.mail?.title || `퀘스트 보상 — ${quest.title}`,
            message: quest.mail?.message || `${quest.title} 퀘스트 달성 보상입니다.`,
            rewards: (quest.mail && quest.mail.rewards) ? quest.mail.rewards : (quest.rewards || {})
          };
          await enqueueMail(uid, mailPayload);
          return questRewardSummary(quest);
        }
        const rewards = quest.rewards || {};
        if(rewards.points){ addPoints(rewards.points); }
        if(rewards.gold){ addGold(rewards.gold); }
        if(rewards.diamonds){ addDiamonds(rewards.diamonds); }
        return questRewardSummary(quest);
      }

      function markQuestCompleted(questId, options){
        if(isAdmin()) return;
        const quest = QUEST_LOOKUP[questId];
        if(!quest) return;
        const status = ensureQuestStatus(questId);
        if(status.completed){
          return;
        }
        status.completed = true;
        status.completedAt = Date.now();
        commitQuestState({});
        if(options?.notify !== false){
          showQuestToast(`${quest.title} 완료! 퀘스트 창에서 보상을 받아가세요.`);
        }
      }

      async function claimQuestReward(questId){
        if(isAdmin()) return false;
        const quest = QUEST_LOOKUP[questId];
        if(!quest) return false;
        const status = ensureQuestStatus(questId);
        if(!status.completed){ showQuestToast('먼저 퀘스트 조건을 달성하세요.'); return false; }
        if(status.rewardGranted){ showQuestToast('이미 보상을 수령했습니다.'); return false; }
        try {
          const summary = await grantQuestReward(quest);
          status.rewardGranted = true;
          status.rewardAt = Date.now();
          commitQuestState({});
          const message = summary ? `${quest.title} 보상 지급! ${summary}` : `${quest.title} 보상을 받았습니다!`;
          showQuestToast(message);
          return true;
        } catch (error) {
          console.error('퀘스트 보상 지급 실패', error);
          showQuestToast('퀘스트 보상 지급에 실패했습니다. 잠시 후 다시 시도해주세요.');
          return false;
        }
      }

      function openQuestModal(opts){ if(!els.questOverlay || !els.questPanel) return; refreshQuestView(); els.questOverlay.hidden = false; requestAnimationFrame(()=>{ els.questOverlay.classList.add('open'); }); document.body.classList.add('modal-open'); state.ui.questOpen = true; if(!opts || !opts.silent){ const quests = ensureQuestState(); if(!quests.seenIntro){ quests.seenIntro = true; commitQuestState({ refreshList: false }); } } }

      function closeQuestModal(){ if(!els.questOverlay) return; state.ui.questOpen = false; els.questOverlay.classList.remove('open'); setTimeout(()=>{ if(!state.ui.questOpen && els.questOverlay){ els.questOverlay.hidden = true; } }, 180); if(!isLegendaryVisible() && !state.ui.characterDetailOpen && !state.ui.userOptionsOpen){ document.body.classList.remove('modal-open'); } }

      function recoverPendingQuestRewards(){ if(isAdmin()) return; ensureQuestState(); let changed = false; QUEST_DEFINITIONS.forEach((quest)=>{ const status = ensureQuestStatus(quest.id); if(status.completed && !status.completedAt){ status.completedAt = Date.now(); changed = true; } }); if(changed){ commitQuestState({ refreshList: false }); refreshQuestBadge(); } else { refreshQuestBadge(); } }

      function maybeShowQuestIntro(){ if(isAdmin()) return; const quests = ensureQuestState(); if(quests.seenIntro || !els.questOverlay){ return; } openQuestModal({ silent: true }); showQuestToast('새로운 퀘스트가 준비되었습니다!'); setTimeout(()=>{ closeQuestModal(); }, 2200); quests.seenIntro = true; commitQuestState({ refreshList: false }); }


      // CSV export
      async function exportCsv(){ const rows = [['draw_id','tier','part','stat','run_id','timestamp','config_hash']]; for(const h of state.session.history){ const partName = getPartNameByKey(h.part) || ''; rows.push([h.id, h.tier, partName, h.stat||0, h.runId, new Date(h.ts).toISOString(), h.cfgHash]); } const csv = rows.map(function(r){ return r.map(function(v){ return String(v); }).join(','); }).join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gacha_session.csv'; a.click(); URL.revokeObjectURL(a.href); }

      // Global persistence
      function defaultGlobalStats(){ return {draws:0, counts:Object.fromEntries(TIERS.map(function(t){ return [t,0]; }))}; }
      function loadGlobal(){ const raw = userProfile?.globalStats; if(!raw || typeof raw !== 'object'){ return defaultGlobalStats(); }
        const stats = defaultGlobalStats();
        if(typeof raw.draws === 'number') stats.draws = raw.draws;
        if(raw.counts && typeof raw.counts === 'object'){
          for(const tier of TIERS){ if(typeof raw.counts[tier] === 'number') stats.counts[tier] = raw.counts[tier]; }
        }
        return stats;
      }
      function saveGlobal(){ if(!userProfile) return; userProfile.globalStats = state.global; markProfileDirty(); }

      // Init
      function reflectConfig(){
        setInputValue(els.seed, state.config.seed||'');
        setCheckboxState(els.lock, state.config.locked);
        setCheckboxState(els.pityEnabled, !!(state.config.pity && state.config.pity.enabled));
        setInputValue(els.pityFloor, (state.config.pity && state.config.pity.floorTier) || 'S');
        setInputValue(els.pitySpan, (state.config.pity && state.config.pity.span) || 90);
        setCheckboxState(els.g10Enabled, !!(state.config.minGuarantee10 && state.config.minGuarantee10.enabled));
        setInputValue(els.g10Tier, (state.config.minGuarantee10 && state.config.minGuarantee10.tier) || 'A');

        // Sync admin controls
        setCheckboxState(els.adminPityEnabled, !!(state.config.pity && state.config.pity.enabled));
        setInputValue(els.adminPityFloor, (state.config.pity && state.config.pity.floorTier) || 'S');
        setInputValue(els.adminPitySpan, (state.config.pity && state.config.pity.span) || 90);
        setCheckboxState(els.adminG10Enabled, !!(state.config.minGuarantee10 && state.config.minGuarantee10.enabled));
        setInputValue(els.adminG10Tier, (state.config.minGuarantee10 && state.config.minGuarantee10.tier) || 'A');

        syncAdminConfigMirrors();
        state.petGachaWeights = sanitizePetWeights(state.config.petWeights);
        state.config.petWeights = { ...state.petGachaWeights };
        updatePetWeightInputs();
        if (els.adminPetWeightTableBody) updateAdminPetWeightInputs();
        renderPetStats();
        state.config.characterWeights = sanitizeWeights(state.config.characterWeights);
        state.config.characterProbs = normalize(state.config.characterWeights);
        updateCharacterWeightsInputs();
        updateAdminWeightsInputs();
        updateAdminCharacterWeightsInputs();
        var dr = state.config.dropRates || DEFAULT_DROP_RATES;
        function setDropInputs(prefix, cfg, defaults){ if(!cfg) cfg = defaults; if(!defaults) defaults = {base:0, perLevel:0, max:1};
          if(els[prefix+'Base']) els[prefix+'Base'].value = (cfg.base ?? defaults.base);
          if(els[prefix+'Per']) els[prefix+'Per'].value = (cfg.perLevel ?? defaults.perLevel);
          if(els[prefix+'Max']) els[prefix+'Max'].value = (cfg.max ?? defaults.max);
        }
        setDropInputs('dropPotion', dr.potion, DEFAULT_DROP_RATES.potion);
        setDropInputs('dropHyper', dr.hyperPotion, DEFAULT_DROP_RATES.hyperPotion);
        setDropInputs('dropProtect', dr.protect, DEFAULT_DROP_RATES.protect);
        setDropInputs('dropEnhance', dr.enhance, DEFAULT_DROP_RATES.enhance);
        setDropInputs('dropBattleRes', dr.battleRes, DEFAULT_DROP_RATES.battleRes);
        var goldCfg = normalizeGoldScaling(state.config.goldScaling);
        if(els.goldMinLow) els.goldMinLow.value = goldCfg.minLow;
        if(els.goldMaxLow) els.goldMaxLow.value = goldCfg.maxLow;
        if(els.goldMinHigh) els.goldMinHigh.value = goldCfg.minHigh;
        if(els.goldMaxHigh) els.goldMaxHigh.value = goldCfg.maxHigh;
        var sp = state.config.shopPrices || DEFAULT_SHOP_PRICES;
        if(els.priceInputPotion) els.priceInputPotion.value = sp.potion ?? DEFAULT_SHOP_PRICES.potion;
        if(els.priceInputHyper) els.priceInputHyper.value = sp.hyperPotion ?? DEFAULT_SHOP_PRICES.hyperPotion;
        if(els.priceInputProtect) els.priceInputProtect.value = sp.protect ?? DEFAULT_SHOP_PRICES.protect;
        if(els.priceInputEnhance) els.priceInputEnhance.value = sp.enhance ?? DEFAULT_SHOP_PRICES.enhance;
        if(els.priceInputBattleRes) els.priceInputBattleRes.value = sp.battleRes ?? DEFAULT_SHOP_PRICES.battleRes;
        if(els.priceInputStarter) els.priceInputStarter.value = sp.starterPack ?? DEFAULT_SHOP_PRICES.starterPack;
        const potCfg = normalizePotionSettings(state.config.potionSettings, DEFAULT_POTION_SETTINGS);
        const hyperCfg = normalizePotionSettings(state.config.hyperPotionSettings, DEFAULT_HYPER_POTION_SETTINGS);
        if(els.potionDuration) els.potionDuration.value = (potCfg.durationMs/1000);
        if(els.potionManualCd) els.potionManualCd.value = (potCfg.manualCdMs/1000);
        if(els.potionAutoCd) els.potionAutoCd.value = (potCfg.autoCdMs/1000);
        if(els.potionSpeedMult) els.potionSpeedMult.value = potCfg.speedMultiplier ?? DEFAULT_POTION_SETTINGS.speedMultiplier ?? 2;
        if(els.hyperDuration) els.hyperDuration.value = (hyperCfg.durationMs/1000);
        if(els.hyperManualCd) els.hyperManualCd.value = (hyperCfg.manualCdMs/1000);
        if(els.hyperAutoCd) els.hyperAutoCd.value = (hyperCfg.autoCdMs/1000);
        if(els.hyperSpeedMult) els.hyperSpeedMult.value = hyperCfg.speedMultiplier ?? DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier ?? 4;
        const monsterCfg = normalizeMonsterScaling(state.config.monsterScaling);
        if(els.monsterBasePower) els.monsterBasePower.value = monsterCfg.basePower;
        if(els.monsterMaxPower) els.monsterMaxPower.value = monsterCfg.maxPower;
        if(els.monsterCurve) els.monsterCurve.value = monsterCfg.curve;
        if(els.monsterDifficultyInput) els.monsterDifficultyInput.value = formatMultiplier(monsterCfg.difficultyMultiplier ?? 1);
        const difficultyAdjustments = normalizedDifficultyAdjustments();
        if(els.difficultyEasyInput) setInputValue(els.difficultyEasyInput, String(difficultyAdjustments.easy));
        if(els.difficultyHardInput) setInputValue(els.difficultyHardInput, String(difficultyAdjustments.hard));
        updateDifficultyPreview();
        updateWeightsInputs();
        updateCharacterBalanceInputs();
        toggleConfigDisabled();
        ensureDrawPresetConfig();
        renderGachaPresetEditor();
        refreshDrawPresetButtonsUI();
        updateDrawButtons();
        updateCombatView(); updateInventoryView(); updateShopButtons(); setShopMessage('', null); updateGachaModeView();
      }

      function updateViewMode(){ const admin = isAdmin(); if(els.whoami){ els.whoami.textContent = state.user? `${state.user.username} (${admin? '관리자':'회원'})` : ''; }
        if(els.adminPanel){ els.adminPanel.style.display = (admin && state.ui.adminView) ? '' : 'none'; if(!admin){ state.ui.adminView = false; } }

        // Add/remove admin-view class from body
        if(admin && state.ui.adminView) {
          document.body.classList.add('admin-view');
        } else {
          document.body.classList.remove('admin-view');
        }
        const configPanel = document.querySelector('#configPanel'); if(configPanel){ configPanel.style.opacity = admin? '1' : '0.92'; }
        if(els.toAdmin){ els.toAdmin.disabled = !admin; }
        document.querySelectorAll('.preset-user-row').forEach(function(node){ node.style.display = admin ? 'none' : ''; });
        if(admin){ state.ui.userEditEnabled = true; }
        updateUserEditModeView();
        toggleConfigDisabled();
        updateShopButtons();
        updatePetWeightInputs();
        ensureDrawPresetConfig();
        renderGachaPresetEditor();
        refreshDrawPresetButtonsUI();
        updateGachaModeView();
      }

      function isUserOptionsOpen(){ return !!state.ui.userOptionsOpen; }

      function syncUserOptionsInputs(){
        if(!els.userOptionsCharacterGif || !els.userOptionsPetGif) return;
        const effects = state.settings?.effects || {};
        els.userOptionsCharacterGif.checked = effects.characterUltimateGif !== false;
        els.userOptionsPetGif.checked = effects.petUltimateGif !== false;
      }

      function openUserOptionsModal(){
        if(!els.userOptionsModal) return;
        syncUserOptionsInputs();
        state.ui.userOptionsOpen = true;
        els.userOptionsModal.hidden = false;
        requestAnimationFrame(()=> els.userOptionsModal.classList.add('show'));
        document.body.classList.add('modal-open');
      }

      function closeUserOptionsModal(options){
        if(!els.userOptionsModal) return;
        state.ui.userOptionsOpen = false;
        els.userOptionsModal.classList.remove('show');
        const delay = options && options.immediate ? 0 : 180;
        setTimeout(()=>{
          if(!state.ui.userOptionsOpen){ els.userOptionsModal.hidden = true; }
        }, delay);
        if(!isLegendaryVisible() && !state.ui.characterDetailOpen){ document.body.classList.remove('modal-open'); }
      }

      function saveUserOptions(){
        if(!els.userOptionsCharacterGif || !els.userOptionsPetGif) return;
        const next = sanitizeUserSettings({
          effects: {
            characterUltimateGif: !!els.userOptionsCharacterGif.checked,
            petUltimateGif: !!els.userOptionsPetGif.checked
          }
        });
        const current = state.settings || sanitizeUserSettings(null);
        const changed = current.effects.characterUltimateGif !== next.effects.characterUltimateGif
          || current.effects.petUltimateGif !== next.effects.petUltimateGif;
        if(changed){
          state.settings = next;
          if(userProfile){ userProfile.settings = next; }
          markProfileDirty();
        }
        closeUserOptionsModal();
      }
      function hydrateSession(){ loadWallet(); loadGold(); loadDiamonds(); startUiTimer(); updateItemCountsView(); updateBuffInfo(); updateReviveButton(); updateShopButtons(); setShopMessage('', null); setDrawMessage('', null); ensureDrawPresetConfig(); renderGachaPresetEditor(); refreshDrawPresetButtonsUI(); updatePetList(); updateGachaModeView(); updateViewMode(); }

      async function loadOrInitializeProfile(firebaseUser){
        if(!firebaseUser) return null;
        const uid = firebaseUser.uid;
        const profileRef = ref(db, `users/${uid}`);
        const fallbackBase = `user-${uid.slice(0, 6)}`;
        let fallbackName = deriveUsernameFromUser(firebaseUser) || fallbackBase;
        fallbackName = sanitizeUsername(fallbackName, fallbackBase) || fallbackBase;
        let snapshot;
        try {
          snapshot = await get(profileRef);
        } catch (error) {
          console.error('프로필을 불러오지 못했습니다.', error);
          throw error;
        }
        if(!snapshot.exists()){
          console.log('🔄 프로필이 없어서 새로 생성합니다');
          // 기본 프로필 생성
          const newProfile = {
            username: fallbackName,
            role: (fallbackName === 'admin') ? 'admin' : 'user',
            gold: 10000,
            diamonds: 0,
            wallet: 0,
            items: {},
            spares: {},
            equip: { head: null, body: null, main: null, off: null, boots: null },
            enhance: {
              probs: [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.025, 0.02, 0.015, 0.01, 0.008, 0.006, 0.004, 0.002],
              costs: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 102400, 204800, 409600, 819200, 1638400, 3276800, 6553600, 13107200, 26214400, 52428800, 104857600]
            },
            config: {
              probs: { "SSS+": 0.5, "SS+": 1.5, "S+": 8, "S": 30, "A": 60, "B": 150, "C": 300, "D": 450 },
              minGuarantee10: { enabled: true, minTier: "S" },
              petWeights: {},
              itemNamePrefix: '',
              customDropRates: {},
              dropRateScaling: {},
              goldScaling: {},
              potionSettings: {},
              hyperPotionSettings: {},
              shopPrices: {},
              monsterScaling: {},
              difficultyAdjustments: {}
            },
            globalStats: {
              totalDraws: 0,
              tierCounts: { "SSS+": 0, "SS+": 0, "S+": 0, "S": 0, "A": 0, "B": 0, "C": 0, "D": 0 },
              totalGold: 0,
              highestEnhance: 0
            },
            pets: {},
            characters: {},
            characterStats: {},
            petGachaWeights: {},
            settings: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          try {
            await set(profileRef, newProfile);
            console.log('✅ 새 프로필 생성 완료');
            return newProfile;
          } catch (error) {
            console.error('새 프로필 생성 실패:', error);
            const missingError = new Error('Profile creation failed');
            missingError.code = 'PROFILE_CREATE_FAILED';
            throw missingError;
          }
        }
        let data = snapshot.val() || {};
        {
          const updates = {};
          if(!data.username){
            data.username = fallbackName;
            updates.username = fallbackName;
          }
          if(!data.role){
            data.role = (data.username === 'admin') ? 'admin' : 'user';
            updates.role = data.role;
          }
          if(data.role !== 'admin' && (typeof data.gold !== 'number' || !isFinite(data.gold))){
            data.gold = 10000;
            updates.gold = 10000;
          }
          if(Object.keys(updates).length){
            updates.updatedAt = Date.now();
            try {
              await update(profileRef, updates);
            } catch (error) {
              console.error('프로필 보정 중 오류가 발생했습니다.', error);
            }
          }
        }
        return data;
      }

      async function applyProfileState(){
        if(!currentFirebaseUser || !userProfile) return;
        detachGlobalConfigListener();
        resetRareAnimationState({ immediate: true });
        const uid = currentFirebaseUser.uid;
        const fallbackBase = `user-${uid.slice(0, 6)}`;
        const derivedName = sanitizeUsername(userProfile.username, deriveUsernameFromUser(currentFirebaseUser) || fallbackBase) || fallbackBase;
        userProfile.username = derivedName;
        const role = userProfile.role === 'admin' || derivedName === 'admin' ? 'admin' : 'user';
        userProfile.role = role;
        document.body.dataset.role = role;
        if(role === 'admin'){
          userProfile.wallet = null;
          userProfile.gold = null;
        } else {
          userProfile.wallet = clampNumber(userProfile.wallet, 0, Number.MAX_SAFE_INTEGER, 1000);
          userProfile.gold = clampNumber(userProfile.gold, 0, Number.MAX_SAFE_INTEGER, 10000);
        }

        state.user = {
          uid,
          username: userProfile.username,
          role,
          email: currentFirebaseUser.email || ''
        };
        state.profile = userProfile;

        const questState = sanitizeQuestState(userProfile.quests);
        state.quests = questState;
        userProfile.quests = questState;
        if(state.profile){ state.profile.quests = questState; }

        attachProfileListener(uid);

        const configFromProfile = sanitizeConfig(userProfile.config);
        const globalData = await fetchGlobalConfig();
        if(globalData){
          state.presets.activeGlobalId = globalData.activePresetId || null;
          state.presets.activeGlobalName = globalData.activePresetName || null;
        } else {
          state.presets.activeGlobalId = null;
          state.presets.activeGlobalName = null;
        }

        const globalConfig = globalData ? sanitizeConfig(globalData.config) : null;
        const globalEnhance = globalData && globalData.enhance ? sanitizeEnhanceConfig(globalData.enhance) : null;
        state.rewardPresets = sanitizeRewardPresets(globalData && globalData.rewardPresets);

        if(role === 'admin'){
          if(globalConfig){
            state.config = globalConfig;
          } else {
            state.config = configFromProfile;
            await persistGlobalConfig(state.config, { activePresetId: state.presets.activeGlobalId, activePresetName: state.presets.activeGlobalName });
          }
        } else {
          state.config = globalConfig ? globalConfig : configFromProfile;
        }
        if(globalEnhance){
          state.enhance = globalEnhance;
        } else {
          state.enhance = defaultEnhance();
          if(role === 'admin'){
            await persistGlobalConfig(state.config, { activePresetId: state.presets.activeGlobalId, activePresetName: state.presets.activeGlobalName });
          }
        }
        if(userProfile.enhance){
          delete userProfile.enhance;
        }
        state.baseConfig = clonePlain(state.config);
        applyFlags((globalData && globalData.flags) || state.flags || DEFAULT_FLAGS, { reflect: false, forceCompose: true });

        buildForgeTable();
        updateForgeInfo();
        const profilePetWeights = sanitizePetWeights(userProfile.petGachaWeights);
        const configPetWeights = sanitizePetWeights(state.config.petWeights);
        const configHasCustom = PET_IDS.some((id) => configPetWeights[id] !== 1);
        const profileHasCustom = PET_IDS.some((id) => profilePetWeights[id] !== 1);
        const finalPetWeights = configHasCustom ? configPetWeights : (profileHasCustom ? profilePetWeights : configPetWeights);

        state.petGachaWeights = finalPetWeights;
        state.config.petWeights = { ...finalPetWeights };
        userProfile.petGachaWeights = finalPetWeights;
        userProfile.config = state.config;
        if(state.flags.rewardsPreset === 'default'){
          state.baseConfig = clonePlain(state.config);
        }

        state.global = sanitizeGlobalStats(userProfile.globalStats);
        userProfile.globalStats = state.global;

        state.items = sanitizeItems(userProfile.items);
        userProfile.items = state.items;
        state.gearShards = sanitizeGearShardState(userProfile.gearShards);
        userProfile.gearShards = state.gearShards;
        state.pets = sanitizePetState(userProfile.pets);
        userProfile.pets = state.pets;
        state.characters = sanitizeCharacterState(userProfile.characters);
        userProfile.characters = state.characters;
        ensureCharacterState();

        // 긴급 백업에서 데이터 복구 시도
        try {
          const emergencyBackup = localStorage.getItem('gacha_emergency_backup');
          if (emergencyBackup) {
            const backupData = JSON.parse(emergencyBackup);
            const backupAge = Date.now() - (backupData.timestamp || 0);

            // 백업이 24시간 이내이고 현재 데이터가 비어있거나 매우 적다면 복구
            const hasItems = state.items && Object.keys(state.items).length > 0;
            const hasGold = state.gold && state.gold > 1000;
            const shouldRestore = backupAge < 86400000 && (!hasItems || !hasGold); // 24시간

            if (shouldRestore && backupData.items && Object.keys(backupData.items).length > 0) {
              console.log('🔄 긴급 백업에서 데이터 복구 중...', {
                backupAge: Math.round(backupAge / 1000 / 60) + '분 전',
                currentItems: Object.keys(state.items || {}).length,
                backupItems: Object.keys(backupData.items || {}).length
              });

              // 아이템 복구
              if (backupData.items && Object.keys(backupData.items).length > 0) {
                state.items = { ...state.items, ...backupData.items };
                userProfile.items = state.items;
              }

              // 골드 복구 (더 높은 값 사용)
              if (backupData.gold !== undefined && backupData.gold > (state.gold || 0)) {
                state.gold = backupData.gold;
                userProfile.gold = backupData.gold;
              }

              // 다이아몬드 복구 (더 높은 값 사용)
              if (backupData.diamonds !== undefined && backupData.diamonds > (state.diamonds || 0)) {
                state.diamonds = backupData.diamonds;
                userProfile.diamonds = backupData.diamonds;
              }

              console.log('✅ 데이터 복구 완료:', {
                items: Object.keys(state.items).length,
                gold: state.gold,
                diamonds: state.diamonds
              });

              // 복구된 데이터를 즉시 저장
              markProfileDirty();

              // 복구 후 백업 삭제
              localStorage.removeItem('gacha_emergency_backup');
            }
          }
        } catch (error) {
          console.error('백업 복구 실패:', error);
        }

        state.characterStats = sanitizeCharacterDrawStats(userProfile.characterStats);
        userProfile.characterStats = state.characterStats;

        state.settings = sanitizeUserSettings(userProfile.settings);
        userProfile.settings = state.settings;

        state.equip = sanitizeEquipMap(userProfile.equip);
        userProfile.equip = state.equip;

        state.spares = sanitizeEquipMap(userProfile.spares);
        userProfile.spares = state.spares;

        state.session = sanitizeSession(userProfile.session);
        if(!Array.isArray(state.session.history)){
          state.session.history = [];
        }
        userProfile.session = state.session;

        state.pitySince = clampNumber(userProfile.pitySince, 0, Number.MAX_SAFE_INTEGER, 0);
        userProfile.pitySince = state.pitySince;

        if(userProfile.combat && typeof userProfile.combat === 'object'){
          state.combat.useBattleRes = !!userProfile.combat.useBattleRes;
          state.combat.prefBattleRes = userProfile.combat.prefBattleRes !== false;
        } else {
          state.combat.useBattleRes = true;
          state.combat.prefBattleRes = true;
        }
        userProfile.combat = { useBattleRes: state.combat.useBattleRes, prefBattleRes: state.combat.prefBattleRes };

        if(userProfile.forge && typeof userProfile.forge === 'object'){
          state.forge.protectEnabled = !!userProfile.forge.protectEnabled;
        } else {
          state.forge.protectEnabled = false;
        }
        state.forge.autoRunning = false;
        userProfile.forge = { protectEnabled: state.forge.protectEnabled };
        setAutoForgeRunning(false);

        if(role === 'admin'){
          state.diamonds = Number.POSITIVE_INFINITY;
        } else {
          state.diamonds = clampNumber(userProfile.diamonds, 0, Number.MAX_SAFE_INTEGER, 0);
          userProfile.diamonds = state.diamonds;
        }
        updateDiamondsView();

        state.presets.personal = sanitizeUserPresets(userProfile.presets);
        userProfile.presets = personalPresetsToMap(state.presets.personal);
        state.selectedPreset = sanitizeSelectedPreset(userProfile.selectedPreset);
        if(!state.selectedPreset.scope || !state.selectedPreset.id){ state.selectedPreset = { scope:null, id:null }; userProfile.selectedPreset = null; }

        await loadGlobalPresets();
        if(role === 'admin'){
          await loadAdminUsers();
        } else {
          state.adminUsers = [];
          populateAdminUserSelect();
        }
        applySelectedPresetIfAvailable(role === 'admin');
        refreshPresetSelectors();
        if(isAdmin()){
          updateFlagControls();
          refreshRareAnimationEditor({ force: true });
        }

        attachGlobalConfigListener();

        refreshInventoryCache();
        const equipIds = PART_KEYS.map(k=> (state.equip[k]?.id)||0);
        const spareIds = PART_KEYS.map(k=> (state.spares[k]?.id)||0);
        const maxId = Math.max(0, ...equipIds, ...spareIds);
        state.itemSeq = Math.max(state.itemSeq, maxId + 1);
        if(!userProfile.createdAt){ userProfile.createdAt = Date.now(); }
        if(!userProfile.updatedAt){ userProfile.updatedAt = Date.now(); }
      }

      function hydrateSessionFromProfile(){
        hydrateSession();
        reflectConfig();
        updateWeightsInputs();
        updateInventoryView();
        updateCharacterList();
        buildForgeTargetOptions();
        updateForgeControlsView();
        updateForgeInfo();
        updateBattleResControls();
        syncStats();
        drawChart();
        renderCharacterStats();
        syncUserOptionsInputs();
        refreshQuestView();
        recoverPendingQuestRewards();
        maybeShowQuestIntro();
      }

      function buildProfilePayload(extra){
        if(!state.user){
          return null;
        }
        const role = state.user.role === 'admin' ? 'admin' : 'user';
        const payload = {
          username: state.user.username,
          role,
          config: sanitizeConfig(state.config),
          globalStats: sanitizeGlobalStats(state.global),
          equip: sanitizeEquipMap(state.equip),
          spares: sanitizeEquipMap(state.spares),
          items: sanitizeItems(state.items),
          gearShards: sanitizeGearShardState(state.gearShards),
          pets: sanitizePetState(state.pets),
          characters: sanitizeCharacterState(state.characters),
          quests: sanitizeQuestState(state.quests),
          characterStats: sanitizeCharacterDrawStats(state.characterStats),
          settings: sanitizeUserSettings(state.settings),
          petGachaWeights: sanitizePetWeights(state.petGachaWeights),
          session: (()=>{
            const snapshot = sanitizeSession(state.session);
            snapshot.history = Array.isArray(state.session?.history)
              ? state.session.history.slice(-200)
              : [];
            return snapshot;
          })(),
          pitySince: clampNumber(state.pitySince, 0, Number.MAX_SAFE_INTEGER, 0),
          combat: {
            useBattleRes: !!state.combat.useBattleRes,
            prefBattleRes: state.combat.prefBattleRes !== false
          },
          forge: {
            protectEnabled: !!state.forge.protectEnabled
          },
          enhance: null,
          createdAt: userProfile?.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        if(extra && typeof extra === 'object'){ mergePlainObjects(payload, extra); }

        if(role !== 'admin'){
          payload.wallet = clampNumber(state.wallet, 0, Number.MAX_SAFE_INTEGER, 0);
          payload.gold = clampNumber(state.gold, 0, Number.MAX_SAFE_INTEGER, 0);
          payload.diamonds = clampNumber(state.diamonds, 0, Number.MAX_SAFE_INTEGER, 0);
          payload.presets = personalPresetsToMap(state.presets.personal);
          payload.selectedPreset = state.selectedPreset && state.selectedPreset.scope ? { scope: state.selectedPreset.scope, id: state.selectedPreset.id } : null;
        } else {
          payload.wallet = null;
          payload.gold = null;
          payload.diamonds = null;
          payload.presets = null;
          payload.selectedPreset = null;
        }
        return payload;
      }

      function markProfileDirty(){
        if(!currentFirebaseUser || !userProfile) return;
        const existing = getProfileSaveTimerRef();
        if(existing){
          clearTimeout(existing);
        }
        const timer = setTimeout(()=>{
          setProfileSaveTimerRef(null);
          saveProfileSnapshot().catch((error)=>{
            console.error('프로필 저장 중 오류가 발생했습니다.', error);
          });
        }, PROFILE_SAVE_DELAY);
        setProfileSaveTimerRef(timer);
      }

      async function saveProfileSnapshot(){
        if(!currentFirebaseUser || !userProfile) return;
        const extraSnapshot = collectPendingProfileExtras();
        const payload = buildProfilePayload(extraSnapshot);
        if(!payload) return;
        const existingTimer = getProfileSaveTimerRef();
        if (existingTimer) {
          clearTimeout(existingTimer);
          setProfileSaveTimerRef(null);
        }
        const uid = currentFirebaseUser.uid;
        const profileRef = ref(db, `users/${uid}`);
        let attempt = 0;
        while(true){
          try {
            await update(profileRef, payload);
            if(typeof payload.username === 'string'){ userProfile.username = payload.username; }
            userProfile.role = payload.role;
            if(Object.prototype.hasOwnProperty.call(payload, 'wallet')){ userProfile.wallet = payload.wallet; }
            if(Object.prototype.hasOwnProperty.call(payload, 'gold')){ userProfile.gold = payload.gold; }
            if(Object.prototype.hasOwnProperty.call(payload, 'diamonds')){ userProfile.diamonds = payload.diamonds; }
            userProfile.pitySince = payload.pitySince;
            userProfile.updatedAt = payload.updatedAt;
            if(payload.createdAt && !userProfile.createdAt){ userProfile.createdAt = payload.createdAt; }
            userProfile.config = state.config;
            userProfile.globalStats = state.global;
            userProfile.items = payload.items || state.items;
            userProfile.pets = state.pets;
            userProfile.characters = state.characters;
            userProfile.characterStats = state.characterStats;
            userProfile.settings = state.settings;
            userProfile.petGachaWeights = state.petGachaWeights;
            if('enhance' in userProfile){ delete userProfile.enhance; }
            userProfile.equip = state.equip;
            userProfile.spares = state.spares;
            userProfile.session = state.session;
            userProfile.combat = { useBattleRes: state.combat.useBattleRes, prefBattleRes: state.combat.prefBattleRes };
            userProfile.forge = { protectEnabled: state.forge.protectEnabled };
            recordProfileSaveSuccess();
            if(isAdmin()){
              await persistGlobalConfig(state.config, { activePresetId: state.presets.activeGlobalId, activePresetName: state.presets.activeGlobalName });
            }
            return;
          } catch (error) {
            console.error(`프로필 저장 실패 (시도 ${attempt + 1})`, error);
            const delay = PROFILE_SAVE_RETRY_DELAYS[attempt];
            if(delay === undefined){
              if(extraSnapshot){
                state.pendingProfileExtras = mergePlainObjects(state.pendingProfileExtras || {}, extraSnapshot);
              }
              const stats = state.profileSaveStats || (state.profileSaveStats = { recent: [], lastWarnAt: 0, lastErrorAt: 0 });
              stats.lastErrorAt = Date.now();
              if(typeof setShopMessage === 'function'){
                setShopMessage('프로필 저장에 실패했습니다. 잠시 후 다시 시도합니다.', 'warn');
              }
              markProfileDirty();
              return;
            }
            await sleep(delay);
            attempt += 1;
          }
        }
      }

      function isAdmin(){ return !!(state.user && state.user.role === 'admin'); }
      async function logout(){
        try {
          const timer = getProfileSaveTimerRef();
          if(timer){
            clearTimeout(timer);
            setProfileSaveTimerRef(null);
          }
          detachProfileListener();
          await saveProfileSnapshot();
          await signOut(auth);
        } catch (error) {
          console.error('로그아웃 중 오류가 발생했습니다.', error);
        } finally {
          state.user = null;
          try { localStorage.removeItem('gachaCurrentUser_v1'); } catch(error){
            console.warn('Failed to clear cached user', error);
          }
          document.body.removeAttribute('data-role');
          setAutoForgeRunning(false);
          stopAutoTimer();
          stopUiTimer();
          setShopMessage('', null);
          window.location.href = 'login.html';
        }
      }
      async function changeAdminPassword(){ if(!isAdmin()) { setAdminMsg('관리자만 변경할 수 있습니다.', 'warn'); return; }
        const user = auth.currentUser;
        if(!user){ setAdminMsg('인증 정보를 확인할 수 없습니다. 다시 로그인해주세요.', 'warn'); return; }
        const oldPassword = els.adminOldPass.value || '';
        const newPassword = els.adminNewPass.value || '';
        if(newPassword.length < 6){ setAdminMsg('새 비밀번호는 6자 이상이어야 합니다.', 'warn'); return; }
        try {
          const email = user.email;
          if(!email){ throw new Error('관리자 이메일을 확인할 수 없습니다.'); }
          const credential = EmailAuthProvider.credential(email, oldPassword);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
          els.adminOldPass.value = '';
          els.adminNewPass.value = '';
          setAdminMsg('비밀번호가 변경되었습니다.', 'ok');
        } catch (error) {
          console.error(error);
          if(error.code === 'auth/wrong-password'){
            setAdminMsg('현재 비밀번호가 올바르지 않습니다.', 'warn');
          } else if(error.code === 'auth/weak-password'){
            setAdminMsg('새 비밀번호가 너무 약합니다.', 'warn');
          } else {
            setAdminMsg('비밀번호 변경 중 오류가 발생했습니다.', 'error');
          }
        }
      }

      function updateCombatView(){ const {atk, def} = getTotals(); if(els.atkTotal) els.atkTotal.textContent = formatNum(atk); if(els.defTotal) els.defTotal.textContent = formatNum(def); if(els.playerAtkStat) els.playerAtkStat.textContent = formatNum(atk); if(els.playerDefStat) els.playerDefStat.textContent = formatNum(def); updateWinProbView(); }
      function updateInventoryView(){ els.invCount.textContent = String(totalKept());
        const grid = els.equipGrid; grid.innerHTML='';
        PART_DEFS.forEach(function(part){
          const item = state.equip[part.key];
          const card = createGearCard(part, item, { kind:'gear-equip' });
          // Add click handler to select for forge
          if(item) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function(e) {
              // Don't trigger if clicking button
              if(e.target.tagName === 'BUTTON') return;
              selectForgeTarget('equip', part.key);
            });
          }
          grid.appendChild(card);
        });
        els.spareList.innerHTML='';
        PART_DEFS.forEach(function(part){
          const spare = state.spares[part.key];
          const card = createGearCard(part, spare, { kind:'gear-spare', button:'착용', emptyText:'예비 없음' });
          // Add click handler to select for forge
          if(spare) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function(e) {
              // Don't trigger if clicking button
              if(e.target.tagName === 'BUTTON') return;
              selectForgeTarget('spare', part.key);
            });
          }
          els.spareList.appendChild(card);
        });
        updateCombatView();
        buildForgeTargetOptions();
        updateReviveButton();
        updateCharacterList();
        updatePetList();
        refreshInventoryCache();
      }

      function selectForgeTarget(type, part) {
        // Switch to equipment tab
        const equipmentTab = document.querySelector('[data-tab="equipment"]');
        if(equipmentTab) {
          equipmentTab.click();
        }
        // Select the item in forge dropdown
        if(els.forgeTarget) {
          const value = `${type}:${part}`;
          els.forgeTarget.value = value;
          updateForgeInfo();
          updateGearShardView();
          // Scroll to forge section
          const forgeSection = document.querySelector('[data-section="equipment"]');
          if(forgeSection) {
            forgeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
      function totalKept(){ return Object.values(state.equip).filter(Boolean).length + PART_KEYS.reduce(function(acc, part){ return acc + (state.spares[part]?1:0); }, 0); }

      function updateCharacterList(){ if(!els.characterList) return; const container = els.characterList; const characters = ensureCharacterState(); const activeId = getActiveCharacterId(); container.innerHTML=''; const fragment = document.createDocumentFragment();
        const entries = CHARACTER_IDS.map((id) => {
          const def = getCharacterDefinition(id) || { name: id, className: '', image: '', stats: {}, tier: 'D' };
          const count = characters.owned?.[id] || 0;
          return {
            id,
            def,
            count,
            isActive: id === activeId,
            tierIndex: TIER_INDEX[def.tier] ?? TIERS.length
          };
        }).filter((entry) => entry.count > 0 || entry.isActive);
        entries.sort((a, b) => {
          if(a.isActive && !b.isActive) return -1;
          if(!a.isActive && b.isActive) return 1;
          if(a.tierIndex !== b.tierIndex) return a.tierIndex - b.tierIndex;
          if(a.count !== b.count) return b.count - a.count;
          return a.id.localeCompare(b.id);
        });
        if(!state.ui.selectedCharacterDetail || !entries.some((entry) => entry.id === state.ui.selectedCharacterDetail)){
          state.ui.selectedCharacterDetail = activeId;
        }
        const balanceConfig = ensureCharacterBalanceConfig();
        const showDetails = isAdmin();
        let appended = 0;
        entries.forEach(({ id, def, count, isActive }) => {
          const enh = characterEnhancementState(id);
          const card = document.createElement('div');
          card.className = 'pet-card character-card';
          card.dataset.character = id;
          card.dataset.tier = def.tier || 'NONE';
          if(isActive) card.classList.add('active');
          const infoWrap = document.createElement('div');
          infoWrap.className = 'character-info';
          const imageSources = getCharacterImageVariants(id);
          if(def.image && !imageSources.includes(def.image)){ imageSources.unshift(def.image); }
          const thumb = createCharacterImageElement(def.name || id, imageSources);
          thumb.alt = def.name || id;
          infoWrap.appendChild(thumb);
          const textWrap = document.createElement('div');
          textWrap.className = 'info';
          const nameEl = document.createElement('div');
          nameEl.className = 'name';
          nameEl.textContent = def.name || id;
          textWrap.appendChild(nameEl);
          if(def.className){ const classEl = document.createElement('div'); classEl.className = 'class muted'; classEl.textContent = def.className; textWrap.appendChild(classEl); }
          const countEl = document.createElement('div');
          countEl.className = 'count';
          countEl.textContent = `보유: ${formatNum(count)}`;
          textWrap.appendChild(countEl);
          const dupEl = document.createElement('div');
          dupEl.className = 'muted small';
          dupEl.textContent = enh.isMax ? '강화: MAX' : `강화 Lv.${enh.level} (${enh.progress}/${enh.next?.cost || 0}) · 중복 ${formatNum(enh.available)}`;
          textWrap.appendChild(dupEl);
          // 실제 전투 스탯 계산 (캐릭터+장비+펫)
          const baseStats = def.stats || {};
          const activePetId = ensurePetState().active || null;

          // 강화 전 스탯
          const baseResult = deriveCombatStats(
            state.equip || {},
            state.enhance,
            baseStats,
            activePetId,
            {
              balance: balanceConfig,
              characterId: id,
              classId: def.classId,
              character: def,
              characterEnhancementLevel: 0
            }
          );

          // 강화 후 스탯
          const enhancedResult = deriveCombatStats(
            state.equip || {},
            state.enhance,
            baseStats,
            activePetId,
            {
              balance: balanceConfig,
              characterId: id,
              classId: def.classId,
              character: def,
              characterEnhancementLevel: enh.level
            }
          );

          const hpBalanced = baseResult.stats.hp;
          const atkBalanced = baseResult.stats.atk;
          const defBalanced = baseResult.stats.def;
          const hpEnhanced = enhancedResult.stats.hp;
          const atkEnhanced = enhancedResult.stats.atk;
          const defEnhanced = enhancedResult.stats.def;
          const enhancementMultiplier = enh.multiplier || 1;

          const statsEl = document.createElement('div');
          statsEl.className = 'stats muted small';

          // 강화 전/후 스탯 표시
          const hpText = enh.level > 0
            ? `${formatNum(hpBalanced)} → <strong>${formatNum(hpEnhanced)}</strong>`
            : formatNum(hpBalanced);
          const atkText = enh.level > 0
            ? `${formatNum(atkBalanced)} → <strong>${formatNum(atkEnhanced)}</strong>`
            : formatNum(atkBalanced);
          const defText = enh.level > 0
            ? `${formatNum(defBalanced)} → <strong>${formatNum(defEnhanced)}</strong>`
            : formatNum(defBalanced);

          statsEl.innerHTML = `HP ${hpText} · ATK ${atkText} · DEF ${defText}`;
          if(enh.level > 0){
            const enhMultEl = document.createElement('div');
            enhMultEl.className = 'enhancement-mult muted small';
            enhMultEl.innerHTML = `<strong>강화 배율: ${formatMultiplier(enhancementMultiplier)}×</strong>`;
            textWrap.appendChild(enhMultEl);
          }
          textWrap.appendChild(statsEl);
          const skillDesc = getCharacterSkillDescription(def);
          if(skillDesc){
            const skillEl = document.createElement('div');
            skillEl.className = 'skill muted small';
            skillEl.textContent = skillDesc;
            textWrap.appendChild(skillEl);
          }
          infoWrap.appendChild(textWrap);
          card.appendChild(infoWrap);
          const actions = document.createElement('div');
          actions.className = 'actions';
          const selectBtn = document.createElement('button');
          selectBtn.type = 'button';
          selectBtn.dataset.character = id;
          selectBtn.textContent = isActive ? '사용중' : '선택';
          if(isActive){
            selectBtn.disabled = true;
          } else {
            selectBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              setActiveCharacter(id);
            });
          }
          actions.appendChild(selectBtn);
          if(enh.available > 0){
            const enhanceBtn = document.createElement('button');
            enhanceBtn.type = 'button';
            enhanceBtn.className = 'character-enhance';
            enhanceBtn.textContent = '강화';
            enhanceBtn.addEventListener('click', (event)=>{
              event.stopPropagation();
              const res = performCharacterEnhancement(id, { consumeAll: false });
              if(res.status === 'no-dup'){
                setForgeMsg('캐릭터 중복이 부족합니다.', 'warn');
              } else if(res.status === 'level-up'){
                setForgeMsg(`캐릭터 강화! Lv.${res.result.levelBefore} → Lv.${res.result.levelAfter}`, 'ok');
              } else if(res.status === 'progress'){
                const next = characterEnhancementState(id);
                setForgeMsg(`캐릭터 강화 진행: Lv.${next.level} (${next.progress}/${next.next?.cost || 0})`, 'ok');
              }
            });
            actions.appendChild(enhanceBtn);
            const enhanceAllBtn = document.createElement('button');
            enhanceAllBtn.type = 'button';
            enhanceAllBtn.className = 'character-enhance-all';
            enhanceAllBtn.textContent = '모두 사용';
            enhanceAllBtn.addEventListener('click', (event)=>{
              event.stopPropagation();
              const res = performCharacterEnhancement(id, { consumeAll: true });
              if(res.status === 'no-dup'){
                setForgeMsg('캐릭터 중복이 부족합니다.', 'warn');
              } else if(res.status === 'level-up'){
                setForgeMsg(`캐릭터 강화! Lv.${res.result.levelBefore} → Lv.${res.result.levelAfter}`, 'ok');
              } else if(res.status === 'progress'){
                const next = characterEnhancementState(id);
                setForgeMsg(`캐릭터 강화 진행: Lv.${next.level} (${next.progress}/${next.next?.cost || 0})`, 'ok');
              }
            });
            actions.appendChild(enhanceAllBtn);
          }
          card.appendChild(actions);
          card.addEventListener('click', (event) => {
            if(event.target instanceof HTMLElement && event.target.closest('button')) return;
            selectCharacterDetail(id);
          });
          fragment.appendChild(card);
          appended += 1;
        });
        if(els.characterDetailHint){
          els.characterDetailHint.textContent = appended === 0
            ? '보유한 캐릭터가 없습니다.'
            : '캐릭터 카드를 눌러 상세 정보를 확인하세요.';
        }
        if(appended === 0){
          const empty = document.createElement('div');
          empty.className = 'muted small';
          empty.textContent = '보유한 캐릭터가 없습니다.';
          container.appendChild(empty);
        } else {
          container.appendChild(fragment);
        }
        updateCharacterDetailSelection();
        renderCharacterStats();
      }

      function setActiveCharacter(characterId){ if(!CHARACTER_IDS.includes(characterId)) return; const characters = ensureCharacterState(); if(!isAdmin() && (characters.owned?.[characterId] || 0) <= 0){ alert('해당 캐릭터를 보유하고 있지 않습니다.'); return; } if(characters.active === characterId) return; characters.active = characterId; state.characters = characters; if(userProfile) userProfile.characters = characters; state.ui.selectedCharacterDetail = characterId; updateInventoryView(); markProfileDirty(); }
      function getTotals(){
        const baseStats = getActiveCharacterBaseStats();
        const activeId = getActiveCharacterId();
        const activeDef = getCharacterDefinition(activeId);
        const derived = deriveCombatStats(
          state.equip,
          state.enhance,
          baseStats,
          state.pets?.active || null,
          {
            balance: state.config?.characterBalance,
            characterId: activeId,
            classId: activeDef?.classId,
            character: activeDef || null
          }
        );
        const stats = derived.stats || { atk: 0, def: 0 };
        return { atk: Math.round(stats.atk || 0), def: Math.round(stats.def || 0), raw: stats };
      }
      function updateWinProbView(){ const lvl = els.monLevel ? parseInt(els.monLevel.value||'1',10) : (state.combat.lastLevel || 1); state.combat.lastLevel = lvl; const {atk, def} = getTotals(); const p = winProbability(atk, def, lvl); const percentText = (p*100).toFixed(2)+'%'; if(els.winProb) els.winProb.textContent = percentText; if(els.battleWinProb) els.battleWinProb.textContent = percentText; if(els.playerHealthBar){ const playerWidth = Math.max(8, Math.min(100, p*100)); els.playerHealthBar.style.width = playerWidth + '%'; }
        if(els.enemyHealthBar){ const enemyWidth = Math.max(8, Math.min(100, 100 - (p*100))); els.enemyHealthBar.style.width = enemyWidth + '%'; }
        if(els.battleEnemyLevel) els.battleEnemyLevel.textContent = String(lvl);
        if(els.battleEnemyReward){ const estimated = calcGoldReward(lvl, ()=>0.5); els.battleEnemyReward.textContent = formatNum(estimated) + ' G'; }
      }
      function setLevel(lvl){ if(!(lvl>=1)) lvl=1; if(lvl>999) lvl=999; state.combat.lastLevel = lvl; if(els.monLevel) els.monLevel.value = String(lvl); if(els.monLevelVal) els.monLevelVal.textContent = String(lvl); if(els.battleEnemyLevel) els.battleEnemyLevel.textContent = String(lvl); if(els.battleEnemyReward){ const estimated = calcGoldReward(lvl, ()=>0.5); els.battleEnemyReward.textContent = formatNum(estimated) + ' G'; } updateWinProbView(); }
      function calcGoldReward(level, rng){
        const cfg = normalizeGoldScaling(state.config?.goldScaling);
        const lvl = Math.max(1, Math.min(MAX_LEVEL, level || 1));
        const ratio = (lvl - 1) / ((MAX_LEVEL - 1) || 1);
        const minVal = Math.round(cfg.minLow + ratio * (cfg.minHigh - cfg.minLow));
        const maxVal = Math.round(cfg.maxLow + ratio * (cfg.maxHigh - cfg.maxLow));
        const low = Math.min(minVal, maxVal);
        const high = Math.max(minVal, maxVal);
        const span = Math.max(0, high - low);
        const roll = Math.floor(((typeof rng === 'function' ? rng() : Math.random()) || 0) * (span + 1));
        return Math.max(1, low + roll);
      }
      function dropRateFor(type, level){
        const table = state.config?.dropRates || DEFAULT_DROP_RATES;
        const spec = table[type] || DEFAULT_DROP_RATES[type];
        if(!spec) return 0;
        const lvl = Math.max(1, Math.min(MAX_LEVEL, level || 1));
        const base = Number(spec.base) || 0;
        const per = Number(spec.perLevel) || 0;
        const max = Number.isFinite(spec.max) ? spec.max : 1;
        let rate = base + per * Math.max(0, lvl - 1);
        if(rate > max) rate = max;
        if(rate < 0) rate = 0;
        return rate;
      }
      function maybeDropItem(type, key, rng, level){
        const chance = dropRateFor(type, level);
        const roll = (typeof rng === 'function' ? rng() : Math.random());
        if(!(roll < chance)) return false;
        state.items[key] = (state.items[key] || 0) + 1;
        return true;
      }
      function maybeDropEnhance(rng, level){ return maybeDropItem('enhance', 'enhance', rng, level); }
      function maybeDropPotion(rng, level){ return maybeDropItem('potion', 'potion', rng, level); }
      function maybeDropHyperPotion(rng, level){ return maybeDropItem('hyperPotion', 'hyperPotion', rng, level); }
      function maybeDropProtect(rng, level){ return maybeDropItem('protect', 'protect', rng, level); }
      function maybeDropBattleRes(rng, level){ return maybeDropItem('battleRes', 'battleRes', rng, level); }
      function consumeBattleResToken(level, mode){ if(isAdmin()) return false; if((state.items.battleRes || 0) <= 0) return false; state.items.battleRes = Math.max(0, (state.items.battleRes || 0) - 1); updateItemCountsView(); const msg = `전투부활권 사용! Lv.${level} ${mode==='auto' ? '자동사냥' : '전투'} 패배를 무효화했습니다.`; if(els.fightResult) els.fightResult.textContent = msg; markProfileDirty(); return true; }
      function doFight(){
        if(!els.monLevel || !els.fightResult) return;
        const now = Date.now();
        const remain = manualCooldownRemain(now);
        if(remain > 0){
          els.fightResult.textContent = `쿨다운 ${Math.ceil(remain/1000)}초 남음`;
          return;
        }
        state.timers.manualLast = now;
        const rng = getRng();
        const lvl = parseInt(els.monLevel.value || '1', 10);
        const { atk, def } = getTotals();
        const p = winProbability(atk, def, lvl);
        const win = rng() < p;
        if(win){
          const reward = levelReward(lvl);
          addPoints(reward);
          const goldGain = calcGoldReward(lvl, rng);
          addGold(goldGain);
          const gains = [];
          if(maybeDropEnhance(rng, lvl)) gains.push('강화권 +1');
          if(maybeDropPotion(rng, lvl)) gains.push('가속 물약 +1');
          if(maybeDropHyperPotion(rng, lvl)) gains.push('초 가속 물약 +1');
          if(maybeDropProtect(rng, lvl)) gains.push('보호권 +1');
          if(maybeDropBattleRes(rng, lvl)) gains.push('전투부활권 +1');
          updateItemCountsView();
          const msg = `Lv.${lvl} 전투 승리! (+${formatNum(reward)} 포인트, +${formatNum(goldGain)} 골드${gains.length ? ', ' + gains.join(', ') : ''}, p=${(p*100).toFixed(2)}%)`;
          els.fightResult.textContent = msg;
          markQuestCompleted('firstBattleWin');
          if(lvl >= 100){
            markQuestCompleted('slayLevel100');
          }
        } else {
          if(consumeBattleResToken(lvl, 'manual')) return;
          els.fightResult.textContent = `Lv.${lvl} 전투 패배... (p=${(p*100).toFixed(2)}%)`;
        }
      }

      function getPotionSettings(){
        const cfg = state.config?.potionSettings || DEFAULT_POTION_SETTINGS;
        return {
          durationMs: Number.isFinite(cfg.durationMs) ? cfg.durationMs : DEFAULT_POTION_SETTINGS.durationMs,
          manualCdMs: Number.isFinite(cfg.manualCdMs) ? cfg.manualCdMs : DEFAULT_POTION_SETTINGS.manualCdMs,
          autoCdMs: Number.isFinite(cfg.autoCdMs) ? cfg.autoCdMs : DEFAULT_POTION_SETTINGS.autoCdMs,
          speedMultiplier: Number.isFinite(cfg.speedMultiplier) ? cfg.speedMultiplier : DEFAULT_POTION_SETTINGS.speedMultiplier
        };
      }
      function getHyperPotionSettings(){
        const cfg = state.config?.hyperPotionSettings || DEFAULT_HYPER_POTION_SETTINGS;
        return {
          durationMs: Number.isFinite(cfg.durationMs) ? cfg.durationMs : DEFAULT_HYPER_POTION_SETTINGS.durationMs,
          manualCdMs: Number.isFinite(cfg.manualCdMs) ? cfg.manualCdMs : DEFAULT_HYPER_POTION_SETTINGS.manualCdMs,
          autoCdMs: Number.isFinite(cfg.autoCdMs) ? cfg.autoCdMs : DEFAULT_HYPER_POTION_SETTINGS.autoCdMs,
          speedMultiplier: Number.isFinite(cfg.speedMultiplier) ? cfg.speedMultiplier : DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier
        };
      }
      function usePotion(){
        const now = Date.now();
        const settings = getPotionSettings();
        if(!isAdmin()){
          if((state.items.potion || 0) <= 0){
            alert('가속 물약이 부족합니다.');
            return;
          }
          state.items.potion = Math.max(0, (state.items.potion || 0) - 1);
        }
        state.buffs.accelUntil = now + (settings.durationMs || DEFAULT_POTION_SETTINGS.durationMs);
        state.buffs.accelMultiplier = settings.speedMultiplier || DEFAULT_POTION_SETTINGS.speedMultiplier;
        updateItemCountsView();
        updateBuffInfo(now);
        markProfileDirty();
      }
      function useHyperPotion(){
        const now = Date.now();
        const settings = getHyperPotionSettings();
        if(!isAdmin()){
          if((state.items.hyperPotion || 0) <= 0){
            alert('초 가속 물약이 부족합니다.');
            return;
          }
          state.items.hyperPotion = Math.max(0, (state.items.hyperPotion || 0) - 1);
        }
        state.buffs.hyperUntil = now + (settings.durationMs || DEFAULT_HYPER_POTION_SETTINGS.durationMs);
        state.buffs.hyperMultiplier = settings.speedMultiplier || DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier;
        updateItemCountsView();
        updateBuffInfo(now);
        markProfileDirty();
      }
      function currentManualCooldown(now){ if(typeof now!=='number') now = Date.now(); if((state.buffs.hyperUntil||0) > now){ const hyperCfg = getHyperPotionSettings(); return Math.max(0, hyperCfg.manualCdMs ?? DEFAULT_HYPER_POTION_SETTINGS.manualCdMs ?? CD_MANUAL_MS); } if((state.buffs.accelUntil||0) > now){ const potCfg = getPotionSettings(); return Math.max(0, potCfg.manualCdMs ?? DEFAULT_POTION_SETTINGS.manualCdMs ?? CD_MANUAL_MS); } return CD_MANUAL_MS; }
      function currentAutoCooldown(now){ if(typeof now!=='number') now = Date.now(); if((state.buffs.hyperUntil||0) > now){ const hyperCfg = getHyperPotionSettings(); return Math.max(0, hyperCfg.autoCdMs ?? DEFAULT_HYPER_POTION_SETTINGS.autoCdMs ?? CD_AUTO_MS); } if((state.buffs.accelUntil||0) > now){ const potCfg = getPotionSettings(); return Math.max(0, potCfg.autoCdMs ?? DEFAULT_POTION_SETTINGS.autoCdMs ?? CD_AUTO_MS); } return CD_AUTO_MS; }
      function manualCooldownRemain(now){ const last = state.timers.manualLast||0; const cd = currentManualCooldown(now); const elapsed = now - last; return Math.max(0, cd - elapsed);
      }
      function autoCooldownRemain(now){ const last = state.timers.autoLast||0; const cd = currentAutoCooldown(now); const elapsed = now - last; return Math.max(0, cd - elapsed);
      }
      function startUiTimer(){ if(state.timers.uiTimer) return; state.timers.uiTimer = setInterval(()=>{ const now=Date.now(); if(els.manualCd) els.manualCd.textContent = Math.ceil(manualCooldownRemain(now)/1000)+'s'; if(els.autoCd) els.autoCd.textContent = Math.ceil(autoCooldownRemain(now)/1000)+'s'; updateBuffInfo(now); }, 500); }
      function updateBuffInfo(now){ now = now || Date.now(); if(!els.buffInfo) return; if((state.buffs.hyperUntil||0) > now){ const remain = Math.ceil((state.buffs.hyperUntil - now)/1000); const mult = formatMultiplier(state.buffs.hyperMultiplier||DEFAULT_HYPER_POTION_SETTINGS.speedMultiplier||4); els.buffInfo.textContent = `초 가속 ${mult}× ${remain}s`; }
        else if((state.buffs.accelUntil||0) > now){ const remain = Math.ceil((state.buffs.accelUntil - now)/1000); const mult = formatMultiplier(state.buffs.accelMultiplier||DEFAULT_POTION_SETTINGS.speedMultiplier||2); els.buffInfo.textContent = `가속 ${mult}× ${remain}s`; }
        else { els.buffInfo.textContent = '버프 없음'; } }
      function stopUiTimer(){ if(state.timers.uiTimer){ clearInterval(state.timers.uiTimer); state.timers.uiTimer=null; } }
      function toggleAutoHunt(){ if(!els.autoHuntBtn) return; state.timers.autoOn = !state.timers.autoOn; els.autoHuntBtn.textContent = '자동사냥: ' + (state.timers.autoOn? 'ON':'OFF'); if(state.timers.autoOn){ startAutoTimer(); } else { stopAutoTimer(); } }
      function startAutoTimer(){ if(state.timers.autoTimer) return; state.timers.autoTimer = setInterval(()=>{ const now=Date.now(); if(autoCooldownRemain(now)>0) return; state.timers.autoLast = now; autoHuntOnce(); }, 1000); }
      function stopAutoTimer(){ if(state.timers.autoTimer){ clearInterval(state.timers.autoTimer); state.timers.autoTimer=null; }
        state.timers.autoLast = 0;
      }
      function autoHuntOnce(){
        if(!els.monLevel) return;
        const rng = getRng();
        const lvl = parseInt(els.monLevel.value || '1', 10);
        const { atk, def } = getTotals();
        const p = winProbability(atk, def, lvl);
        const win = rng() < p;
        if(win){
          const reward = levelReward(lvl);
          addPoints(reward);
          const goldGain = calcGoldReward(lvl, rng);
          addGold(goldGain);
          const gains = [];
          if(maybeDropEnhance(rng, lvl)) gains.push('강화권 +1');
          if(maybeDropPotion(rng, lvl)) gains.push('가속 물약 +1');
          if(maybeDropHyperPotion(rng, lvl)) gains.push('초 가속 물약 +1');
          if(maybeDropProtect(rng, lvl)) gains.push('보호권 +1');
          if(maybeDropBattleRes(rng, lvl)) gains.push('전투부활권 +1');
          updateItemCountsView();
          if(els.fightResult){
            const msg = `자동사냥: Lv.${lvl} 승리! (+${formatNum(reward)} 포인트, +${formatNum(goldGain)} 골드${gains.length ? ', ' + gains.join(', ') : ''}, p=${(p*100).toFixed(2)}%)`;
            els.fightResult.textContent = msg;
          }
          markQuestCompleted('firstBattleWin');
          if(lvl >= 100){
            markQuestCompleted('slayLevel100');
          }
        } else {
          if(consumeBattleResToken(lvl, 'auto')){ return; }
          const choosePoints = rng() < 0.5;
          if(choosePoints && !isAdmin() && state.wallet > 0){
            const lost = Math.floor(state.wallet * 0.5);
            state.wallet -= lost;
            saveWallet();
            updatePointsView();
            if(els.fightResult) els.fightResult.textContent = `자동사냥: Lv.${lvl} 패배... 포인트 ${formatNum(lost)} 손실`;
          } else {
            const n = Math.max(1, Math.min(3, (1 + Math.floor(rng() * 3))));
            const removed = removeRandomItems(n, rng);
            const removedTxt = removed.map(itemLabel).join(', ');
            if(els.fightResult) els.fightResult.textContent = `자동사냥: Lv.${lvl} 패배... 장비 ${removed.length}개 손실 (${removedTxt})`;
            updateInventoryView();
          }
          maybeAwardRevive();
        }
      }
      function maybeAwardRevive(){ if(isAdmin()) return false; var emptyEquip = totalKept()===0; var noPoints = (state.wallet||0) <= 0; if(emptyEquip && noPoints){ state.items.revive = (state.items.revive||0) + 1; addPoints(1000); updateItemCountsView(); updateReviveButton(); markProfileDirty(); if(els.fightResult) els.fightResult.textContent += ' [부활권 +1, +1000포인트 지급]'; return true; } return false; }
      function itemLabel(it){ const name = getPartNameByKey(it.part) || ''; return `${name} ${it.tier}`; }
      function removeRandomItems(k, rng){ const pool = []; PART_DEFS.forEach(function(p){ const eq = state.equip[p.key]; if(eq) pool.push({type:'equip', part:p.key, item:eq}); const spare = state.spares[p.key]; if(spare) pool.push({type:'spare', part:p.key, item:spare}); }); if(pool.length===0) return []; shuffle(pool, rng); const selected = pool.slice(0, Math.min(k, pool.length)); selected.forEach(function(entry){ if(entry.type==='equip'){ state.equip[entry.part] = null; } else if(entry.type==='spare'){ state.spares[entry.part] = null; } }); updateInventoryView(); markProfileDirty(); return selected.map(function(e){ return e.item; }); }
      function applyEquipAndInventory(item, opts){ opts = opts || {}; const decision = opts.decision || null; const part = item.part; const current = state.equip[part];
        if(decision === 'discard'){ addGearShards(item.tier, 1); markProfileDirty(); updateGearShardView(); return; }
        if(decision === 'equip'){
          if(current){ storeSpare(current); }
          state.equip[part] = item;
        } else if(decision === 'spare'){
          storeSpare(item, true);
        } else {
          const better = !current || (effectiveStat(item) > effectiveStat(current)) || (effectiveStat(item) === effectiveStat(current) && TIER_RANK[item.tier] > TIER_RANK[current.tier]);
          if(better){
            if(current){ storeSpare(current); }
            state.equip[part] = item;
          } else {
            storeSpare(item);
          }
        }
        if(state.spares[part] === state.equip[part]){ state.spares[part] = null; }
        refreshInventoryCache();
        markProfileDirty();
      }

      // Forge UI/model
      function onSpareListClick(e){ const target = e.target; if(!(target instanceof HTMLButtonElement)) return; if(!target.classList.contains('equip-btn')) return; const part = target.dataset.part; if(!part) return; equipSpare(part); }
      function equipSpare(part){
        const spareItem = state.spares[part];
        if(!spareItem){ alert('예비 장비가 없습니다.'); return; }
        const equipped = state.equip[part];
        const partName = (PART_DEFS.find((p) => p.key === part)?.name) || '장비';
        if(equipped){
          const ok = confirm(`${partName} 부위에 장착된 장비를 예비로 이동하고 선택한 장비로 교체할까요?`);
          if(!ok) return;
          state.spares[part] = equipped;
        } else {
          state.spares[part] = null;
        }
        state.equip[part] = spareItem;
        updateInventoryView();
        buildForgeTargetOptions();
        updateItemCountsView();
        setForgeMsg('장비를 교체했습니다.', 'ok');
        markProfileDirty();
      }

      function setAutoForgeRunning(running){ running = !!running; state.forge.autoRunning = running; if(els.forgeAuto){ els.forgeAuto.textContent = running ? '진행 중...' : '모두 사용'; els.forgeAuto.classList.toggle('forge-auto-running', running); els.forgeAuto.disabled = running; }
        if(els.forgeOnce){ els.forgeOnce.disabled = running; } }

      function buildForgeTable(){ const tb = els.forgeTableBody; if(tb){ tb.innerHTML=''; }
        updateGearShardView(); }

      function buildForgeTargetOptions(){ const sel = els.forgeTarget; if(!sel) return; const options = []; PART_DEFS.forEach(function(p){ const it = state.equip[p.key]; if(it){ options.push({ value: `equip:${p.key}`, label: `장착-${p.name} ${it.tier} ${formatNum(effectiveStat(it))} (${formatGearEnhancementLabel(it)})` }); } }); PART_DEFS.forEach(function(p){ const spare = state.spares[p.key]; if(spare){ options.push({ value: `spare:${p.key}`, label: `예비-${p.name} ${spare.tier} ${formatNum(effectiveStat(spare))} (${formatGearEnhancementLabel(spare)})` }); } }); const prev = sel.value; sel.innerHTML = ''; if(options.length === 0){ const opt = document.createElement('option'); opt.value = ''; opt.textContent = '강화할 장비 없음'; sel.appendChild(opt); sel.value = ''; updateForgeInfo(); updateForgeControlsView(); return; } options.forEach(function(entry){ const opt = document.createElement('option'); opt.value = entry.value; opt.textContent = entry.label; sel.appendChild(opt); }); sel.value = options.some((entry)=> entry.value === prev) ? prev : options[0].value; updateForgeInfo(); updateForgeControlsView(); }

      function currentForgeItem(){ const sel = els.forgeTarget; if(!sel || !sel.value) return null; const [type, part] = sel.value.split(':'); if(type === 'equip') return state.equip[part] || null; if(type === 'spare') return state.spares[part] || null; return null; }

      function updateForgeInfo(){
        const item = currentForgeItem();
        if(!item){
          if(els.forgeLv) els.forgeLv.textContent = '-';
          if(els.forgeMul) els.forgeMul.textContent = '1.00×';
          if(els.forgeStageMul) els.forgeStageMul.textContent = '-';
          if(els.forgePreview) els.forgePreview.textContent = '-';
          if(els.forgeShardProgress) els.forgeShardProgress.textContent = '-';
          if(els.forgeShardAvail) els.forgeShardAvail.textContent = '0';
          if(els.forgeTicketRate) els.forgeTicketRate.textContent = '-';
          if(els.forgeTicketCost) els.forgeTicketCost.textContent = '-';
          if(els.forgeTicketHave) els.forgeTicketHave.textContent = '0';
          if(els.forgeProtectHave) els.forgeProtectHave.textContent = '0';
          if(els.forgeGoldHave) els.forgeGoldHave.textContent = '0';
          return;
        }
        const info = gearEnhancementState(item);
        console.log('[DEBUG] updateForgeInfo - item.lvl:', item.lvl, 'info:', info);
        const currentMul = getEnhancementMultiplier(info.level);

        // Display level with custom label if available
        if(els.forgeLv) {
          const currentRule = getEnhancementRule(info.level);
          const levelLabel = (currentRule && currentRule.label) ? currentRule.label : `Lv.${info.level}`;
          els.forgeLv.textContent = levelLabel;
        }
        if(els.forgeMul) els.forgeMul.textContent = formatMultiplier(currentMul) + '×';
        if(els.forgeStageMul){
          if(info.next){
            const nextMul = getEnhancementMultiplier(info.next.level);
            els.forgeStageMul.textContent = formatMultiplier(nextMul) + '×';
          } else {
            els.forgeStageMul.textContent = 'MAX';
          }
        }
        if(els.forgePreview){
          const previewStat = Math.floor(item.base * currentMul);
          els.forgePreview.textContent = formatNum(previewStat);
        }

        // Update ticket section (Lv.1-20)
        const nextRule = info.next;
        const enhance = state.items.enhance || 0;
        const protect = state.items.protect || 0;
        const gold = state.gold || 0;
        if(nextRule && nextRule.mode === 'ticket') {
          const ticketCost = nextRule.ticketCost || 0;
          const protectCost = nextRule.protectCost || 0;
          const goldCost = nextRule.goldCost || 0;
          const successRate = nextRule.successRate || 0.5;

          if(els.forgeTicketRate) els.forgeTicketRate.textContent = `${(successRate * 100).toFixed(0)}%`;
          if(els.forgeTicketCost) els.forgeTicketCost.textContent = `강화권 ${ticketCost}개, 보호권 ${protectCost}개, 골드 ${goldCost.toLocaleString()}G`;
          if(els.forgeTicketHave) els.forgeTicketHave.textContent = formatNum(enhance);
          if(els.forgeProtectHave) els.forgeProtectHave.textContent = formatNum(protect);
          if(els.forgeGoldHave) els.forgeGoldHave.textContent = gold.toLocaleString();
        } else {
          if(els.forgeTicketRate) els.forgeTicketRate.textContent = 'Lv.1-20만 사용 가능';
          if(els.forgeTicketCost) els.forgeTicketCost.textContent = '-';
          if(els.forgeTicketHave) els.forgeTicketHave.textContent = formatNum(enhance);
          if(els.forgeProtectHave) els.forgeProtectHave.textContent = formatNum(protect);
          if(els.forgeGoldHave) els.forgeGoldHave.textContent = gold.toLocaleString();
        }

        // Update shard section (MAX+1 to MAX+8)
        const available = availableGearShards(item.tier);
        if(nextRule && nextRule.mode === 'shard') {
          const needed = Math.max(0, nextRule.cost - info.progress);
          if(els.forgeShardProgress) els.forgeShardProgress.textContent = `${info.progress}/${nextRule.cost} (${needed}개 필요)`;
          if(els.forgeShardAvail) els.forgeShardAvail.textContent = formatNum(available);
        } else {
          if(els.forgeShardProgress) els.forgeShardProgress.textContent = 'MAX+1 이상만 사용 가능';
          if(els.forgeShardAvail) els.forgeShardAvail.textContent = formatNum(available);
        }
      }

      function updateForgeControlsView(){
        const item = currentForgeItem();
        if(!item) {
          if(els.forgeOnce) els.forgeOnce.disabled = true;
          if(els.forgeAuto) els.forgeAuto.disabled = true;
          if(els.forgeTicket) els.forgeTicket.disabled = true;
          if(els.forgeTicketProtect) els.forgeTicketProtect.disabled = true;
          return;
        }
        const info = gearEnhancementState(item);
        const nextRule = info.next;

        // Shard buttons
        if(nextRule && nextRule.mode === 'shard') {
          if(els.forgeOnce) els.forgeOnce.disabled = false;
          if(els.forgeAuto) els.forgeAuto.disabled = false;
        } else {
          if(els.forgeOnce) els.forgeOnce.disabled = true;
          if(els.forgeAuto) els.forgeAuto.disabled = true;
        }

        // Ticket buttons (including auto)
        if(nextRule && nextRule.mode === 'ticket') {
          if(els.forgeTicket) els.forgeTicket.disabled = false;
          if(els.forgeTicketProtect) els.forgeTicketProtect.disabled = false;
          if(els.forgeTicketAuto) els.forgeTicketAuto.disabled = false;
        } else {
          if(els.forgeTicket) els.forgeTicket.disabled = true;
          if(els.forgeTicketProtect) els.forgeTicketProtect.disabled = true;
          if(els.forgeTicketAuto) els.forgeTicketAuto.disabled = true;
        }
      }

      function updateGearShardView(){
        if(!els.gearShardSummary) return;
        const shards = ensureGearShards();
        const summary = TIERS.map((tier)=> `${tier}: ${formatNum(shards[tier] || 0)}`).join(' · ');

        const item = currentForgeItem();
        const detailContainer = document.getElementById('gearShardDetail');

        if(item && item.tier && detailContainer) {
          const tierShards = shards[item.tier] || 0;
          detailContainer.innerHTML = `
            <div><b id="gearShardSummary">${summary}</b></div>
            <div style="margin-top: 8px; padding: 8px; background: rgba(0,150,255,0.1); border-radius: 4px;">
              <div style="font-size: 0.9em; color: #5af;">
                ✨ 선택한 장비(<b>${item.tier}</b>) 강화 가능 횟수: <b style="font-size: 1.2em;">${formatNum(tierShards)}개</b>
              </div>
              <div style="font-size: 0.8em; color: #888; margin-top: 4px;">
                ※ 같은 티어의 중복 장비는 부위 상관없이 공용으로 사용됩니다
              </div>
            </div>
          `;
        } else if(detailContainer) {
          detailContainer.innerHTML = `<div><b id="gearShardSummary">${summary}</b></div>`;
        } else {
          els.gearShardSummary.textContent = summary;
        }
      }

      function switchForgeTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.forge-tab').forEach(tab => {
          if(tab.dataset.forgeTab === tabName) {
            tab.classList.add('active');
            tab.style.borderBottomColor = '#5af';
            tab.style.color = '#5af';
            tab.style.fontWeight = 'bold';
          } else {
            tab.classList.remove('active');
            tab.style.borderBottomColor = 'transparent';
            tab.style.color = '#888';
            tab.style.fontWeight = 'normal';
          }
        });

        // Update tab content
        document.querySelectorAll('.forge-tab-content').forEach(content => {
          if(content.dataset.forgeContent === tabName) {
            content.style.display = '';
          } else {
            content.style.display = 'none';
          }
        });

        // If switching to info tab, populate the table
        if(tabName === 'info') {
          buildForgeInfoTable();
        }
      }

      function buildForgeInfoTable() {
        const tbody = document.getElementById('forgeInfoTableBody');
        if(!tbody) return;

        tbody.innerHTML = '';
        let cumulativeBonus = 0;

        ENHANCEMENT_RULES.forEach(rule => {
          cumulativeBonus += rule.bonus;
          const row = document.createElement('tr');

          const levelLabel = rule.label || `Lv.${rule.level}`;
          const mode = rule.mode === 'ticket' ? '강화권' : '중복';

          let resources = '-';
          if(rule.mode === 'ticket') {
            resources = `강화권 ${rule.ticketCost}개, 보호권 ${rule.protectCost}개, ${(rule.goldCost || 0).toLocaleString()}G`;
          } else if(rule.mode === 'shard') {
            resources = `중복 ${rule.cost}개`;
          }

          const successRate = rule.successRate ? `${(rule.successRate * 100).toFixed(0)}%` : '100%';
          const bonus = `+${(rule.bonus * 100).toFixed(0)}%`;
          const cumulative = `×${(1 + cumulativeBonus).toFixed(2)}`;

          row.innerHTML = `
            <td style="font-weight: bold;">${levelLabel}</td>
            <td>${mode}</td>
            <td style="font-size: 0.85em;">${resources}</td>
            <td>${successRate}</td>
            <td>${bonus}</td>
            <td style="font-weight: bold; color: #5af;">${cumulative}</td>
          `;

          tbody.appendChild(row);
        });
      }

      function setForgeMsg(text, tone){ if(!els.forgeMsg) return; els.forgeMsg.textContent = text || ''; els.forgeMsg.classList.remove('msg-ok','msg-warn','msg-danger','muted'); if(tone==='ok'){ els.forgeMsg.classList.add('msg-ok'); } else if(tone==='warn'){ els.forgeMsg.classList.add('msg-warn'); } else if(tone==='danger'){ els.forgeMsg.classList.add('msg-danger'); } else { els.forgeMsg.classList.add('muted'); } }

      function showForgeEffect(kind){
        const eff = els.forgeEffect;
        if(!eff) return;
        const textMap = {
          success:'강화 완료!',
          progress:'강화 진행',
          fail:'재료 부족',
          protected:'장비 보호됨',
          destroyed:'장비 파괴!'
        };
        const existing = getForgeEffectTimerRef();
        if(existing){
          clearTimeout(existing);
          setForgeEffectTimerRef(null);
        }
        eff.classList.remove('success','progress','fail','protected','destroyed','show');
        void eff.offsetWidth;
        if(kind === 'success'){ eff.classList.add('success'); }
        else if(kind === 'progress'){ eff.classList.add('progress'); }
        else if(kind === 'protected'){ eff.classList.add('protected'); }
        else if(kind === 'destroyed'){ eff.classList.add('destroyed'); }
        else { eff.classList.add('fail'); }
        eff.textContent = textMap[kind] || '';
        eff.classList.add('show');
        const timer = setTimeout(()=>{
          if(!els.forgeEffect) return;
          eff.classList.remove('show','success','progress','fail','protected','destroyed');
          eff.textContent='';
          setForgeEffectTimerRef(null);
        }, 720);
        setForgeEffectTimerRef(timer);
      }

      function performForgeAttempt(opts){
        opts = opts||{};
        const consumeAll = !!opts.consumeAll;
        const useProtect = !!opts.useProtect;
        const item = currentForgeItem();
        if(!item){
          setForgeMsg('강화할 장비를 선택하세요.', 'warn');
          showForgeEffect('fail');
          return {status:'no-item'};
        }
        const info = gearEnhancementState(item);
        if(info.isMax){
          setForgeMsg('이미 최대 강화 단계입니다.', 'warn');
          showForgeEffect('fail');
          return {status:'max'};
        }

        const nextRule = info.next;
        if(!nextRule) return {status:'max'};

        // Phase 1: Shard-based enhancement (Lv.1-7)
        if(nextRule.mode === 'shard') {
          const available = availableGearShards(item.tier);
          if(available <= 0){
            setForgeMsg('사용 가능한 중복이 없습니다.', 'warn');
            showForgeEffect('fail');
            return {status:'no-shards'};
          }
          const needed = Math.max(1, nextRule.cost - info.progress);
          const use = consumeAll ? available : Math.min(available, needed);
          const result = applyGearShardsToItem(item, use);
          if(result.consumed <= 0){
            setForgeMsg('사용할 중복이 없습니다.', 'warn');
            showForgeEffect('fail');
            return {status:'no-shards'};
          }
          spendGearShards(item.tier, result.consumed);
          updateInventoryView();
          updateForgeInfo();
          markProfileDirty();
          if(result.levelAfter > result.levelBefore){
            const fromLabel = getEnhancementRule(result.levelBefore)?.label || `Lv.${result.levelBefore}`;
            const toLabel = getEnhancementRule(result.levelAfter)?.label || `Lv.${result.levelAfter}`;
            setForgeMsg(`강화 성공! ${fromLabel} → ${toLabel} (중복 ${result.consumed}개 사용)`, 'ok');
            showForgeEffect('success');
            return {status:'level-up', consumed: result.consumed};
          }
          const levelLabel = getEnhancementRule(result.levelAfter)?.label || `Lv.${result.levelAfter}`;
          setForgeMsg(`강화 진행: ${levelLabel} (${result.progressAfter}/${nextRule.cost || 0})`, 'ok');
          showForgeEffect('progress');
          return {status:'progress', consumed: result.consumed};
        }

        // Phase 2: Ticket-based enhancement (Lv.8-20)
        if(nextRule.mode === 'ticket') {
          const ticketCost = nextRule.ticketCost || 0;
          const protectCost = nextRule.protectCost || 0;
          const goldCost = nextRule.goldCost || 0;
          const successRate = nextRule.successRate || 0.5;

          // Check resources
          const enhance = state.items.enhance || 0;
          const protect = state.items.protect || 0;
          const gold = state.gold || 0;

          if(enhance < ticketCost) {
            setForgeMsg(`강화권이 부족합니다. (필요: ${ticketCost}개, 보유: ${enhance}개)`, 'warn');
            showForgeEffect('fail');
            return {status:'no-enhance'};
          }
          if(useProtect && protect < protectCost) {
            setForgeMsg(`보호권이 부족합니다. (필요: ${protectCost}개, 보유: ${protect}개)`, 'warn');
            showForgeEffect('fail');
            return {status:'no-protect'};
          }
          if(gold < goldCost) {
            setForgeMsg(`골드가 부족합니다. (필요: ${goldCost.toLocaleString()}G)`, 'warn');
            showForgeEffect('fail');
            return {status:'no-gold'};
          }

          // Consume resources
          state.gold -= goldCost;
          state.items.enhance -= ticketCost;
          if(useProtect) {
            state.items.protect -= protectCost;
          }

          // Roll for success
          const roll = Math.random();
          const success = roll < successRate;

          if(success) {
            // Success: increase level
            item.lvl = nextRule.level;
            item.progress = 0;
            updateInventoryView();
            updateForgeInfo();
            markProfileDirty();
            const fromLabel = getEnhancementRule(info.level)?.label || `Lv.${info.level}`;
            const toLabel = getEnhancementRule(nextRule.level)?.label || `Lv.${nextRule.level}`;
            setForgeMsg(`강화 성공! ${fromLabel} → ${toLabel} (확률: ${(successRate * 100).toFixed(0)}%)`, 'ok');
            showForgeEffect('success');
            return {status:'success', newLevel: nextRule.level};
          } else {
            // Failure
            if(useProtect) {
              // Protected: item survives
              updateInventoryView();
              updateForgeInfo();
              markProfileDirty();
              setForgeMsg(`강화 실패! 보호권 사용으로 장비 유지 (확률: ${(successRate * 100).toFixed(0)}%)`, 'warn');
              showForgeEffect('protected');
              return {status:'protected'};
            } else {
              // Destroyed: remove item
              removeItem(item);
              updateInventoryView();
              updateForgeInfo();
              markProfileDirty();
              setForgeMsg(`강화 실패! 장비가 파괴되었습니다... (확률: ${(successRate * 100).toFixed(0)}%)`, 'error');
              showForgeEffect('destroyed');
              return {status:'destroyed'};
            }
          }
        }

        return {status:'unknown'};
      }



      function toggleAutoForge(){
        performForgeAttempt({ consumeAll: true });
      }

      function doForgeOnce(){
        performForgeAttempt({ consumeAll: false });
      }

      function doForgeTicket(){
        performForgeAttempt({ consumeAll: false, useProtect: false });
      }

      function doForgeTicketProtect(){
        performForgeAttempt({ consumeAll: false, useProtect: true });
      }

      async function doForgeTicketAuto(){
        const item = currentForgeItem();
        if(!item) {
          setForgeMsg('강화할 장비를 선택하세요.', 'warn');
          return;
        }

        const info = gearEnhancementState(item);
        const nextRule = info.next;

        if(!nextRule || nextRule.mode !== 'ticket') {
          setForgeMsg('강화권 모드(Lv.1-20)에서만 자동 강화를 사용할 수 있습니다.', 'warn');
          return;
        }

        const confirmed = confirm('자동 강화를 시작하시겠습니까?\n\n- 강화권+골드를 소모하여 반복 시도합니다.\n- 보호권을 사용하여 장비 파괴를 방지합니다.\n- 성공 또는 보호권/강화권/골드 소진시 중단됩니다.\n- 중간에 멈출 수 없으므로 신중히 선택하세요.');
        if(!confirmed) return;

        // Disable buttons during auto forge
        if(els.forgeTicket) els.forgeTicket.disabled = true;
        if(els.forgeTicketProtect) els.forgeTicketProtect.disabled = true;
        if(els.forgeTicketAuto) els.forgeTicketAuto.disabled = true;
        if(els.forgeOnce) els.forgeOnce.disabled = true;
        if(els.forgeAuto) els.forgeAuto.disabled = true;

        let attempts = 0;
        let maxAttempts = 1000; // Safety limit

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        while(attempts < maxAttempts) {
          const currentItem = currentForgeItem();
          if(!currentItem) {
            setForgeMsg('장비가 없습니다. 자동 강화를 중단합니다.', 'warn');
            break;
          }

          const info = gearEnhancementState(currentItem);
          const nextRule = info.next;

          if(!nextRule) {
            setForgeMsg(`최대 레벨 도달! (시도 횟수: ${attempts}회)`, 'ok');
            break;
          }

          if(nextRule.mode !== 'ticket') {
            setForgeMsg(`Lv.${info.level} 달성! 강화권 모드가 끝났습니다. (시도: ${attempts}회)`, 'ok');
            break;
          }

          const ticketCost = nextRule.ticketCost || 0;
          const protectCost = nextRule.protectCost || 0;
          const goldCost = nextRule.goldCost || 0;
          const enhance = state.items.enhance || 0;
          const protect = state.items.protect || 0;
          const gold = state.gold || 0;

          // Check resources
          if(enhance < ticketCost) {
            setForgeMsg(`강화권 부족으로 자동 강화를 중단합니다. (현재: Lv.${info.level}, 시도: ${attempts}회)`, 'warn');
            break;
          }
          if(protect < protectCost) {
            setForgeMsg(`보호권 부족으로 자동 강화를 중단합니다. (현재: Lv.${info.level}, 시도: ${attempts}회)`, 'warn');
            break;
          }
          if(gold < goldCost) {
            setForgeMsg(`골드 부족으로 자동 강화를 중단합니다. (현재: Lv.${info.level}, 시도: ${attempts}회)`, 'warn');
            break;
          }

          attempts++;
          const result = performForgeAttempt({ consumeAll: false, useProtect: true });

          if(result.status === 'success') {
            setForgeMsg(`Lv.${result.newLevel} 강화 성공! 계속 진행중... (시도: ${attempts}회)`, 'ok');
            // Continue to next level
            await delay(300);
            continue;
          }

          if(result.status === 'destroyed') {
            setForgeMsg(`장비가 파괴되었습니다. 자동 강화를 중단합니다. (시도: ${attempts}회)`, 'error');
            break;
          }

          if(result.status === 'protected') {
            // Failed but protected, retry same level
            await delay(300);
            continue;
          }

          // Brief delay for UI update
          await delay(300);
        }

        if(attempts >= maxAttempts) {
          setForgeMsg(`안전을 위해 자동 강화를 중단했습니다. (최대 시도 횟수 도달)`, 'warn');
        }

        // Re-enable buttons
        updateForgeControlsView();
      }

      function removeItem(item){ if(!item) return; PART_KEYS.forEach(function(part){ if(state.equip[part] === item){ state.equip[part] = null; } if(state.spares[part] === item){ state.spares[part] = null; } }); refreshInventoryCache(); buildForgeTargetOptions(); markProfileDirty(); }
      // 강화 관련 로직은 forge 모듈로 이동했습니다.


      // Bootstrap DOM
      renderDiamondShop();
      buildWeightsTable(); buildCharacterWeightsTable(); renderPetWeightTable(); updateProbabilityTables();
      // Initialize admin tables
      if(els.adminWeightsTable) buildWeightsTable(els.adminWeightsTable, 'admin');
      if(els.adminCharacterWeightsBody) buildCharacterWeightsTable(els.adminCharacterWeightsBody, 'admin');
      if(els.adminPetWeightTableBody) renderAdminPetWeightTable();
      bind(); readLink(); reflectConfig(); buildForgeTable(); buildForgeTargetOptions(); updateForgeInfo();

      attachAuthObserver({ auth, onAuthStateChanged }, {
        beforeSwitch: () => {
          const pendingTimer = getProfileSaveTimerRef();
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            setProfileSaveTimerRef(null);
          }
        },
        onLogout: async () => {
          setCurrentFirebaseUserRef(null);
          setUserProfileRef(null);
          detachProfileListener();
          detachGlobalConfigListener();
          resetRareAnimationState({ immediate: true });
          window.location.href = 'login.html';
        },
        onLogin: async (firebaseUser) => {
          setCurrentFirebaseUserRef(firebaseUser);
          try {
            setUserProfileRef(await loadOrInitializeProfile(firebaseUser));
            await applyProfileState();
            hydrateSessionFromProfile();
            if(els.appWrap){ els.appWrap.style.display = ''; }
          } catch (error) {
            console.error('프로필을 불러오지 못했습니다.', error);
            if(error && error.code === 'PROFILE_NOT_FOUND'){
              setShopMessage('프로필 정보를 찾을 수 없습니다. 다시 로그인하세요.', 'error');
              await signOut(auth);
              window.location.href = 'login.html';
              return;
            }
            if(error && error.code === 'PROFILE_CREATE_FAILED'){
              setShopMessage('새 프로필 생성에 실패했습니다. 다시 시도하세요.', 'error');
              await signOut(auth);
              window.location.href = 'login.html';
              return;
            }
            setShopMessage('프로필을 불러오지 못했습니다.', 'error');
          }
        },
        onError: (error) => {
          console.error('인증 상태 처리 실패', error);
          setShopMessage('인증 상태 처리 중 오류가 발생했습니다.', 'error');
        }
      });

      window.addEventListener('beforeunload', ()=>{
        const timer = getProfileSaveTimerRef();
        if (timer) { clearTimeout(timer); setProfileSaveTimerRef(null); }
        // 동기적으로 localStorage에 백업 저장
        try {
          if (userProfile && state.items) {
            const backupData = {
              userProfile: userProfile,
              items: state.items,
              gold: state.gold,
              diamonds: state.diamonds,
              timestamp: Date.now()
            };
            localStorage.setItem('gacha_emergency_backup', JSON.stringify(backupData));
          }
        } catch (error) {
          console.error('Emergency backup failed:', error);
        }
      });

      // Slot Machine System Functions
      function initSlotMachine() {
        slotMachineState.overlay = document.getElementById('slotMachineOverlay');
        console.log('슬롯머신 초기화:', slotMachineState.overlay ? '성공' : '실패');
        const slotSkip = document.getElementById('slotSkip');

        // 기존 이벤트 리스너 제거 (중복 방지)
        if (slotSkip && slotSkipHandler) {
          slotSkip.removeEventListener('click', slotSkipHandler);
        }
        if (escKeyHandler) {
          document.removeEventListener('keydown', escKeyHandler);
        }

        // 새로운 이벤트 리스너 등록
        if (slotSkip) {
          slotSkipHandler = () => {
            if (slotMachineState.isRunning) {
              console.log('스킵 버튼 클릭됨');
              slotMachineState.skipRequested = true;
            }
          };
          slotSkip.addEventListener('click', slotSkipHandler);
        }

        // ESC key to skip
        escKeyHandler = (e) => {
          if (e.key === 'Escape' && slotMachineState.isRunning) {
            console.log('ESC 키 눌림');
            slotMachineState.skipRequested = true;
          }
        };
        document.addEventListener('keydown', escKeyHandler);

        // Hook into existing draw buttons
        hookDrawButtons(); // 슬롯머신 활성화
      }

      function hookDrawButtons() {
        console.log('hookDrawButtons 호출됨');

        // 중복 호출 방지
        if (hookDrawButtons.isHooked) {
          console.log('이미 hookDrawButtons가 실행됨, 중복 실행 방지');
          return;
        }
        hookDrawButtons.isHooked = true;

        // 장비 뽑기 버튼들과 프리셋 매핑
        const drawButtons = [
          { id: 'drawBasic1', mode: 'single', presetId: 'drawBasic1' },
          { id: 'drawBoost1', mode: 'single', presetId: 'drawBoost1' },
          { id: 'drawPremium1', mode: 'single', presetId: 'drawPremium1' },
          { id: 'drawBasic10', mode: 'multi', presetId: 'drawBasic10' },
          { id: 'drawBoost10', mode: 'multi', presetId: 'drawBoost10' },
          { id: 'drawPremium10', mode: 'multi', presetId: 'drawPremium10' }
        ];

        // 원래 이벤트 리스너들을 모두 무력화
        GEAR_PRESET_IDS.forEach((presetId) => {
          const btn = els[presetId];
          if (btn) {
            console.log('원래 이벤트 리스너 제거:', presetId);
            // onclick 속성 제거
            btn.onclick = null;
            // 모든 이벤트 리스너 제거를 위해 버튼 교체
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            // els 참조 업데이트
            els[presetId] = newBtn;
          }
        });

        drawButtons.forEach(({ id, mode, presetId }) => {
          const button = document.getElementById(id);
          console.log('슬롯머신 이벤트 추가:', id, button ? '버튼 찾음' : '버튼 없음');

          if (button) {
            // 슬롯머신 이벤트 리스너 추가
            button.addEventListener('click', async (e) => {
              console.log('🎰 슬롯머신 버튼 클릭:', id, mode, presetId);
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              if (!slotMachineState.isRunning) {
                console.log('슬롯머신 실행 시작');
                await showSlotMachineWithActualDraw(mode, presetId);
              } else {
                console.log('슬롯머신 이미 실행 중');
              }

              return false;
            });
          }
        });
      }

      async function showSlotMachineWithActualDraw(mode, presetId) {
        console.log('슬롯머신 시작 요청:', mode, presetId, 'isRunning:', slotMachineState.isRunning);

        if (slotMachineState.isRunning) {
          console.warn('슬롯머신 이미 실행 중, 요청 무시');
          return;
        }

        const preset = getDrawPreset('gear', presetId);
        if (!preset) {
          console.error('프리셋을 찾을 수 없습니다:', presetId);
          return;
        }

        // 상태 초기화 및 설정
        slotMachineState.isRunning = true;
        slotMachineState.currentMode = mode;
        slotMachineState.skipRequested = false;
        slotMachineState.results = [];
        slotMachineState.gridSlotsProcessed = false;

        console.log('슬롯머신 상태 설정 완료:', slotMachineState);

        // 슬롯머신 UI 표시
        if (!slotMachineState.overlay) {
          console.error('슬롯머신 오버레이를 찾을 수 없습니다');
          return;
        }
        slotMachineState.overlay.hidden = false;
        slotMachineState.overlay.classList.add('visible');

        // 단일/멀티 슬롯 표시
        const singleSlot = document.getElementById('singleSlot');
        const multiSlot = document.getElementById('multiSlot');

        if (mode === 'single') {
          if (singleSlot) singleSlot.style.display = 'block';
          if (multiSlot) multiSlot.style.display = 'none';
        } else {
          if (singleSlot) singleSlot.style.display = 'none';
          if (multiSlot) multiSlot.style.display = 'block';
        }

        // 이제 실제 뽑기 함수 호출 (결과는 runDraws에서 처리됨)
        await runDraws(preset);
      }

      function hideSlotMachine() {
        console.log('hideSlotMachine 호출됨');

        // 모든 실행 중인 애니메이션과 타이머 강제 정리
        const allSlotReels = document.querySelectorAll('.slot-reel');
        allSlotReels.forEach(reel => {
          if (reel) {
            reel.style.animation = 'none';
            reel.style.animationPlayState = 'paused';
          }
        });

        // 상태 즉시 초기화 (비동기 처리 전에)
        slotMachineState.isRunning = false;
        slotMachineState.skipRequested = false;
        slotMachineState.currentMode = null;
        slotMachineState.results = [];
        slotMachineState.gridSlotsProcessed = false;
        slotMachineState.collectedData = null;
        slotMachineState.drawCount = 0;

        if (!slotMachineState.overlay) return;

        // 모든 슬롯 릴들을 초기 상태로 리셋
        const allReels = document.querySelectorAll('.slot-reel');
        allReels.forEach(reel => {
          reel.style.animation = 'none';
          reel.style.transform = 'translateY(0%)';
          reel.style.transition = '';
          reel.style.animationPlayState = '';
          reel.style.animationDelay = '';
          reel.style.animationDuration = '';
          reel.style.animationIterationCount = '';
          reel.style.animationFillMode = '';
        });

        console.log('🔄 모든 슬롯 릴 상태 초기화 완료');

        // UI 숨기기
        slotMachineState.overlay.classList.remove('visible');
        setTimeout(() => {
          if (slotMachineState.overlay) {
            slotMachineState.overlay.hidden = true;
          }
          console.log('슬롯머신 완전히 숨김 완료');
        }, 300);
      }

      async function runSingleSlotAnimationWithResult(resultTier) {
        return new Promise((resolve) => {
          updateSlotMessage('슬롯 머신을 돌리는 중...');
          updateSlotProgress(0);

          const slotReel = document.querySelector('#singleSlot .slot-reel');
          if (!slotReel) {
            resolve();
            return;
          }

          // 결과 티어에 맞는 슬롯 위치 계산
          const tierElements = slotReel.querySelectorAll('.slot-tier');
          console.log('🎯 [슬롯매칭] 실제 뽑기 결과 티어:', `"${resultTier}"`, typeof resultTier);
          console.log('🎰 [슬롯매칭] 슬롯 티어들:', Array.from(tierElements).map((el, idx) => `${idx}: "${el.textContent.trim()}"`));

          let targetIndex = -1;
          for (let i = 0; i < tierElements.length; i++) {
            const slotTier = tierElements[i].textContent.trim();
            console.log(`🔍 [슬롯매칭] 비교 ${i}: "${slotTier}" === "${resultTier}" ? ${slotTier === resultTier}`);
            if (slotTier === resultTier) {
              targetIndex = i;
              console.log(`✅ [슬롯매칭] 매칭 성공! 인덱스: ${i}, 티어: ${slotTier}`);
              break;
            }
          }

          // 매칭 실패시 디버깅 정보
          if (targetIndex === -1) {
            console.error(`❌ [슬롯매칭] 티어 매칭 실패!`, {
              resultTier: `"${resultTier}"`,
              resultTierType: typeof resultTier,
              resultTierLength: resultTier ? resultTier.length : 'undefined',
              availableTiers: Array.from(tierElements).map(el => `"${el.textContent.trim()}"`)
            });
            // 임시로 중간 인덱스 사용하지 말고 에러 상태 유지
            // targetIndex = Math.floor(tierElements.length / 2);
          }

          console.log('🎯 [슬롯매칭] 최종 타겟 인덱스:', targetIndex);

          // 티어를 찾지 못한 경우 기본값 사용
          if (targetIndex === -1) {
            console.warn(`⚠️ 티어 "${resultTier}"를 슬롯에서 찾을 수 없음. D 등급으로 설정.`);
            targetIndex = 7; // D 등급 (마지막 인덱스)
          }

          // 안정적인 슬롯 애니메이션
          let progress = 0;
          let isAnimationRunning = true;
          let animationInterval = null;

          const startAnimation = () => {
            console.log('슬롯 애니메이션 시작');
            slotReel.style.animation = 'slotSpinFast 0.1s linear infinite';

            animationInterval = setInterval(() => {
              if (!isAnimationRunning) {
                clearInterval(animationInterval);
                return;
              }

              // 스킵 요청 시 즉시 결과로 점프
              if (slotMachineState.skipRequested) {
                console.log('⚡ 스킵 요청됨 - 즉시 결과로 점프');
                clearInterval(animationInterval);
                isAnimationRunning = false;

                // 빠른 점프 애니메이션
                jumpToResult();
                return;
              }

              progress += 2;
              updateSlotProgress(Math.min(progress, 95));

              // 속도 조절
              if (progress < 30) {
                slotReel.style.animation = 'slotSpinFast 0.08s linear infinite';
              } else if (progress < 60) {
                slotReel.style.animation = 'slotSpin 0.15s linear infinite';
              } else if (progress < 80) {
                slotReel.style.animation = 'slotSpinSlow 0.25s linear infinite';
              }

              if (progress >= 100) {
                console.log('애니메이션 완료, 슬롯 멈춤 시작');
                clearInterval(animationInterval);
                isAnimationRunning = false;
                finishSlot();
              }
            }, 100);
          };

          const jumpToResult = () => {
            console.log('⚡ jumpToResult 호출됨 - 즉시 결과로 점프');

            // 애니메이션 즉시 중단
            slotReel.style.animation = 'none';

            // 빠른 트랜지션으로 결과 위치로 이동
            const tierElements = slotReel.querySelectorAll('.slot-tier');
            const tierCount = tierElements.length;
            const tierHeight = 100 / tierCount;
            const tierCenter = (targetIndex * tierHeight) + (tierHeight / 2);
            const offset = -(tierCenter - 50);

            slotReel.style.transition = 'transform 0.3s ease-out';
            slotReel.style.transform = `translateY(${offset}%)`;

            // 프로그레스 바 즉시 완료
            updateSlotProgress(100);
            updateSlotMessage(`⚡ ${resultTier} 등급 획득!`);

            // 텍스트 이펙트 표시
            setTimeout(() => {
              const slotMachine = slotReel.closest('.slot-machine') || slotReel.closest('#singleSlot');
              showTierEffectOnSlot(resultTier, slotMachine);
            }, 200);

            // 완료
            setTimeout(() => {
              console.log('⚡ 스킵 완료:', resultTier);
              finalizeSingleSlot(resultTier, resolve);
            }, 600);
          };

          const finishSlot = async () => {
            console.log('finishSlot 호출됨');
            if (animationInterval) {
              clearInterval(animationInterval);
              animationInterval = null;
            }

            // 슬롯 멈춤
            await stopAtTargetTier(slotReel, targetIndex);

            // 결과 표시
            setTimeout(() => {
              console.log('슬롯머신 단일 슬롯 완료:', resultTier);
              finalizeSingleSlot(resultTier, resolve);
            }, 500);
          };

          // 애니메이션 시작
          startAnimation();
        });
      }

      function showTierEffectOnSlot(tierText, slotElement) {
        console.log('슬롯 위치에 텍스트 이펙트 표시:', tierText, slotElement);

        if (!slotElement) {
          console.warn('슬롯 엘리먼트가 없습니다');
          return;
        }

        // 슬롯의 기존 이펙트 제거
        const existingEffect = slotElement.querySelector('.tier-effect-local');
        if (existingEffect) {
          existingEffect.remove();
        }

        // 새 이펙트 생성
        const effect = document.createElement('div');
        effect.className = 'tier-effect-local';
        effect.textContent = `${tierText}!`;
        effect.setAttribute('data-tier', tierText);

        // 슬롯 위치에 추가 (relative positioning)
        slotElement.style.position = 'relative';
        slotElement.appendChild(effect);

        // 애니메이션 시작
        setTimeout(() => {
          effect.classList.add('show');
        }, 10);

        // 2초 후 제거
        setTimeout(() => {
          if (effect.parentNode) {
            effect.classList.remove('show');
            setTimeout(() => {
              if (effect.parentNode) {
                effect.remove();
              }
            }, 500);
          }
        }, 2000);
      }

      function stopAtTargetTier(slotReel, targetIndex) {
        return new Promise((resolve) => {
          console.log('stopAtTargetTier 호출:', { targetIndex, element: slotReel });

          if (!slotReel) {
            console.error('slotReel이 null입니다!');
            resolve({ status: 'skipped', reason: 'missing-reel' });
            return;
          }

          // 모든 CSS 애니메이션 강제 중단
          slotReel.style.animation = 'none !important';
          slotReel.style.animationPlayState = 'paused';
          slotReel.style.animationDelay = '0s';
          slotReel.style.animationDuration = '0s';
          slotReel.style.animationIterationCount = '0';
          slotReel.style.animationFillMode = 'forwards';

          // 모든 애니메이션 관련 클래스 제거
          slotReel.classList.remove('slot-spinning', 'slot-fast', 'slot-slow');

          // 즉시 리플로우 강제 실행 (여러 번)
          slotReel.offsetHeight;
          slotReel.getBoundingClientRect();

          console.log('애니메이션 중단 완료');

          let safeIndex = Number.isInteger(targetIndex) ? targetIndex : 0;
          if (safeIndex < 0) {
            console.warn('targetIndex가 음수입니다. 0으로 보정합니다.');
            safeIndex = 0;
          }

          const tierElements = slotReel.querySelectorAll('.slot-tier');
          if (!tierElements.length) {
            console.warn('티어 요소를 찾을 수 없습니다.');
            resolve({ status: 'skipped', reason: 'no-tier-elements' });
            return;
          }

          if (safeIndex >= tierElements.length) {
            console.warn('targetIndex가 범위를 벗어났습니다. 마지막 요소로 조정합니다.', {
              requestedIndex: targetIndex,
              clampedIndex: tierElements.length - 1,
              length: tierElements.length
            });
            safeIndex = tierElements.length - 1;
          }

          const targetElement = tierElements[safeIndex];
          const targetTierName = targetElement?.textContent.trim() || 'Unknown';

          // 애니메이션을 잠시 끄고 측정 준비
          slotReel.style.animation = 'none';
          slotReel.style.transform = 'translateY(0%)';

          // DOM 업데이트 강제 실행
          slotReel.offsetHeight;

          const slotMachine = slotReel.closest('.slot-machine');
          const selector = slotMachine ? slotMachine.querySelector('.slot-selector') : null;
          if (!slotMachine || !selector) {
            console.warn('⚠️ 슬롯머신 또는 선택자를 찾을 수 없습니다');
            resolve({ status: 'skipped', reason: 'missing-selector' });
            return;
          }

          const reelRect = slotReel.getBoundingClientRect();
          const selectorRect = selector.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();

          const selectorCenter = selectorRect.top + selectorRect.height / 2;
          const targetCenter = targetRect.top + targetRect.height / 2;
          const offsetPx = selectorCenter - targetCenter;
          const offsetPercent = (offsetPx / reelRect.height) * 100;

          console.log(`🎯 실시간 위치 계산:`, {
            targetIndex: safeIndex,
            targetTier: targetTierName,
            selectorCenter: Math.round(selectorCenter),
            targetCenter: Math.round(targetCenter),
            offsetPx: Math.round(offsetPx),
            offsetPercent: Math.round(offsetPercent * 100) / 100,
            reelHeight: Math.round(reelRect.height)
          });

          slotReel.style.transition = 'transform 0.5s ease-out';

          setTimeout(() => {
            slotReel.style.transform = `translateY(${offsetPercent}%)`;
            console.log(`✅ ${targetTierName} 슬롯 위치 설정 완료: ${offsetPercent}%`);

            setTimeout(() => {
              const updatedTierElements = slotReel.querySelectorAll('.slot-tier');
              if (updatedTierElements[safeIndex]) {
                const tierText = updatedTierElements[safeIndex].textContent.trim();
                const targetSlotMachine = slotReel.closest('.slot-machine') || slotReel.closest('#singleSlot');
                showTierEffectOnSlot(tierText, targetSlotMachine);
              }
            }, 600);

            resolve({
              status: 'aligned',
              index: safeIndex,
              tier: targetTierName,
              offsetPercent
            });
          }, 100);
        });
      }

      async function runMultiSlotAnimationWithResults(results) {
        return new Promise((resolve) => {
          updateSlotMessage('3x3 슬롯을 돌리는 중...');
          updateSlotProgress(0);

          const gridSlots = document.querySelectorAll('.grid-slot .slot-reel');

          // 9개의 결과와 1개의 보너스 결과로 분리
          const gridResults = results.slice(0, 9);
          const bonusResult = results[9] || results[results.length - 1];

          console.log('🎰 10회 뽑기 슬롯 데이터:');
          console.log('- 전체 results:', results);
          console.log('- gridResults:', gridResults);
          console.log('- bonusResult:', bonusResult);

          // 모든 그리드 슬롯 빠르게 회전
          gridSlots.forEach((reel, index) => {
            setTimeout(() => {
              reel.style.animation = 'slotSpinFast 0.1s linear infinite';
            }, index * 100);
          });

          let progress = 0;
          const progressInterval = setInterval(() => {
            if (slotMachineState.skipRequested) {
              console.log('⚡ 멀티 슬롯 스킵 요청됨');
              clearInterval(progressInterval);

              // 즉시 모든 그리드 슬롯을 결과로 설정
              jumpToMultiSlotResults(gridResults);

              // 보너스 슬롯도 즉시 결과로 설정
              setTimeout(() => {
                jumpToBonusResult(bonusResult, resolve);
              }, 300);
              return;
            }

            progress += 1.5;
            updateSlotProgress(progress);

            if (progress >= 40) {
              // 그리드 슬롯들을 결과에 맞게 하나씩 멈춤
              stopGridSlotsWithResults(gridResults);
            }

            if (progress >= 70) {
              clearInterval(progressInterval);
              runBonusSlotAnimationWithResult(bonusResult, resolve);
            }
          }, 80);
        });
      }

      function jumpToMultiSlotResults(results) {
        console.log('⚡ jumpToMultiSlotResults 호출됨');
        const gridSlots = document.querySelectorAll('.grid-slot .slot-reel');

        gridSlots.forEach((reel, index) => {
          if (reel && results[index]) {
            const tier = results[index];

            // 애니메이션 즉시 중단
            reel.style.animation = 'none';

            // 빠른 트랜지션으로 결과 위치로 이동
            setTimeout(() => {
              setSlotResult(reel, tier);

              // 텍스트 이펙트
              if (tier === 'SSS+' || tier === 'SS+' || tier === 'S+') {
                setTimeout(() => {
                  const slotContainer = reel.closest('.grid-slot');
                  showTierEffectOnSlot(tier, slotContainer);
                }, 100);
              }
            }, index * 50); // 순차적으로 빠르게 표시
          }
        });

        updateSlotMessage('⚡ 그리드 슬롯 스킵 완료!');
      }

      function jumpToBonusResult(bonusResult, resolve) {
        console.log('⚡ jumpToBonusResult 호출됨:', bonusResult);

        const bonusReel = document.querySelector('.bonus-slot .slot-reel');
        if (!bonusReel) {
          if (resolve) resolve();
          return;
        }

        // 애니메이션 즉시 중단
        bonusReel.style.animation = 'none';

        // 즉시 결과로 설정
        setSlotResult(bonusReel, bonusResult);

        updateSlotMessage(`⚡ ${bonusResult} 등급 보너스 스킵 완료!`);
        updateSlotProgress(100);

        // 보너스 슬롯 텍스트 이펙트
        if (bonusResult === 'SSS+' || bonusResult === 'SS+' || bonusResult === 'S+') {
          setTimeout(() => {
            const bonusContainer = bonusReel.closest('.bonus-slot');
            showTierEffectOnSlot(`💥 ${bonusResult} 💥`, bonusContainer);
          }, 200);
        }

        setTimeout(() => {
          hideSlotMachine();
          if (resolve) resolve();
        }, 800);
      }

      function stopGridSlotsWithResults(results) {
        const gridSlots = document.querySelectorAll('.grid-slot .slot-reel');
        console.log('stopGridSlotsWithResults 호출됨. 결과:', results);

        // 이미 처리된 경우 중복 실행 방지
        if (slotMachineState.gridSlotsProcessed) {
          console.log('그리드 슬롯 이미 처리됨, 중복 실행 방지');
          return;
        }
        slotMachineState.gridSlotsProcessed = true;

        gridSlots.forEach((reel, index) => {
          setTimeout(() => {
            const tier = results[index] || 'D';
            console.log(`그리드 슬롯 ${index+1} 표시: ${tier}`);

            // 강제 애니메이션 중단
            reel.style.animation = 'none';
            reel.style.animationPlayState = 'paused';
            reel.offsetHeight; // 리플로우 강제 실행

            setSlotResult(reel, tier);

            // 희귀 등급 플래시 효과
            if (tier === 'SSS+' || tier === 'SS+') {
              reel.parentElement.style.animation = 'slotFlash 1s ease-in-out 3';
            }

            // 각 슬롯에 개별 텍스트 이펙트 (모든 등급)
            setTimeout(() => {
              console.log(`그리드 슬롯 ${index+1} 텍스트 이펙트 시도:`, tier);
              const slotContainer = reel.closest('.grid-slot');
              console.log('슬롯 컨테이너:', slotContainer);
              showTierEffectOnSlot(tier, slotContainer);
            }, 300);
          }, index * 200);
        });
      }

      function runBonusSlotAnimationWithResult(bonusResult, resolve) {
        console.log('🎁 보너스 슬롯 시작, bonusResult:', bonusResult);
        updateSlotMessage('⭐ 보너스 슬롯 실행 중... ⭐');

        const bonusReel = document.querySelector('.bonus-slot .slot-reel');
        if (!bonusReel) {
          console.error('보너스 슬롯 릴을 찾을 수 없음');
          if (resolve) resolve();
          return;
        }

        let bonusTimer1, bonusTimer2;

        // 스킵 체크 함수
        const checkSkip = () => {
          if (slotMachineState.skipRequested) {
            console.log('⚡ 보너스 슬롯 스킵 요청됨');
            // 모든 타이머 정리
            if (bonusTimer1) clearTimeout(bonusTimer1);
            if (bonusTimer2) clearTimeout(bonusTimer2);

            // 즉시 결과로 점프
            jumpToBonusResult(bonusResult, resolve);
            return true;
          }
          return false;
        };

        bonusReel.style.animation = 'slotSpinFast 0.15s linear infinite';

        bonusTimer1 = setTimeout(() => {
          if (checkSkip()) return;
          bonusReel.style.animation = 'slotSpin 0.3s linear infinite';
        }, 1000);

        bonusTimer2 = setTimeout(() => {
          if (checkSkip()) return;

          // 보너스 결과에 맞게 멈춤
          bonusReel.style.animation = 'none';
          console.log('🎁 보너스 슬롯 결과 설정:', bonusResult);
          setSlotResult(bonusReel, bonusResult);

          updateSlotMessage(`🎉 ${bonusResult} 등급 보너스 획득! 🎉`);

          if (bonusResult === 'SSS+' || bonusResult === 'SS+') {
            bonusReel.parentElement.style.animation = 'bonusPulse 2s ease-in-out 3';
          }

          // 보너스 슬롯에 텍스트 이펙트
          if (bonusResult === 'SSS+' || bonusResult === 'SS+' || bonusResult === 'S+') {
            setTimeout(() => {
              const bonusContainer = bonusReel.closest('.bonus-slot');
              showTierEffectOnSlot(`💥 ${bonusResult} 💥`, bonusContainer);
            }, 300);
          }

          setTimeout(() => {
            finalizeMultiSlot(resolve);
          }, 2000);
        }, 2500);
      }

      function finalizeSingleSlot(resultTier, onComplete) {
        const message = resultTier ? `${resultTier} 등급 획득!` : '🎉 1회 뽑기 완료! 🎉';
        updateSlotMessage(message);
        updateSlotProgress(100);

        setTimeout(async () => {
          hideSlotMachine();
          await triggerOriginalDraw();
          if (typeof onComplete === 'function') onComplete();
        }, 2000);
      }

      function finalizeMultiSlot(onComplete) {
        updateSlotMessage('🎉 10회 뽑기 완료! 🎉');
        updateSlotProgress(100);

        setTimeout(async () => {
          hideSlotMachine();
          await triggerOriginalDraw();
          if (typeof onComplete === 'function') onComplete();
        }, 2500);
      }

      function setSlotResult(reel, tier) {
        if (!reel) return;

        const tierElements = reel.querySelectorAll('.slot-tier');
        console.log(`🎰 [setSlotResult] 요청된 티어: "${tier}"`);
        console.log(`🎰 [setSlotResult] 슬롯 티어들:`, Array.from(tierElements).map(el => `"${el.textContent.trim()}"`));
        let targetIndex = -1;

        tierElements.forEach((el, index) => {
          const slotTier = el.textContent.trim();
          console.log(`🔍 [setSlotResult] 비교 ${index}: "${slotTier}" === "${tier}" ? ${slotTier === tier}`);
          if (slotTier === tier) {
            targetIndex = index;
          }
        });

        if (targetIndex !== -1) {
          const targetElement = tierElements[targetIndex];
          const targetTierName = targetElement.textContent.trim();

          // 애니메이션을 잠시 끄고 측정
          reel.style.animation = 'none';
          reel.style.transform = 'translateY(0%)';

          // DOM 업데이트 강제 실행
          reel.offsetHeight;

          // 그리드 슬롯과 보너스 슬롯 구분 처리
          const gridSlot = reel.closest('.grid-slot');
          const bonusSlot = reel.closest('.bonus-slot');

          if (bonusSlot) {
            // 보너스 슬롯도 실시간 DOM 측정 사용 (더 정확함)
            const selector = bonusSlot.querySelector('.slot-selector');
            if (!selector) {
              console.error(`❌ [setSlotResult] .slot-selector를 찾을 수 없음 in bonus-slot`);
              return;
            }

            console.log(`🎁 [setSlotResult] 보너스 슬롯 실시간 측정 시작:`, {
              tier,
              targetIndex,
              targetTier: targetTierName
            });

            const reelRect = reel.getBoundingClientRect();
            const selectorRect = selector.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            // 요소들이 유효한지 확인
            if (!reelRect.height || !selectorRect.height || !targetRect.height) {
              console.error(`❌ [setSlotResult] 보너스 슬롯 요소 크기를 측정할 수 없음`, {
                reelHeight: reelRect.height,
                selectorHeight: selectorRect.height,
                targetHeight: targetRect.height
              });
              return;
            }

            const selectorCenter = selectorRect.top + selectorRect.height / 2;
            const targetCenter = targetRect.top + targetRect.height / 2;
            const offsetPx = selectorCenter - targetCenter;
            const offsetPercent = (offsetPx / reelRect.height) * 100;

            console.log(`✅ [setSlotResult] 보너스 슬롯 실시간 계산:`, {
              tier,
              targetTier: targetTierName,
              selectorCenter,
              targetCenter,
              offsetPx,
              offsetPercent: `${offsetPercent.toFixed(2)}%`
            });

            reel.style.transition = 'transform 0.3s ease-out';
            setTimeout(() => {
              reel.style.transform = `translateY(${offsetPercent}%)`;
              console.log(`✅ [보너스 슬롯] ${targetTierName} 위치 설정 완료: ${offsetPercent.toFixed(2)}%`);
            }, 50);
          } else if (gridSlot) {
            // 그리드 슬롯은 실시간 DOM 측정 사용
            const selector = gridSlot.querySelector('.slot-selector');
            if (!selector) {
              console.error(`❌ [setSlotResult] .slot-selector를 찾을 수 없음 in grid-slot`);
              return;
            }

            reel.style.animation = 'none';
            reel.style.transform = 'translateY(0%)';
            reel.offsetHeight;

            const reelRect = reel.getBoundingClientRect();
            const selectorRect = selector.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            // 요소들이 유효한지 확인
            if (!reelRect.height || !selectorRect.height || !targetRect.height) {
              console.error(`❌ [setSlotResult] 요소 크기를 측정할 수 없음`, {
                reelHeight: reelRect.height,
                selectorHeight: selectorRect.height,
                targetHeight: targetRect.height
              });
              return;
            }

            const selectorCenter = selectorRect.top + selectorRect.height / 2;
            const targetCenter = targetRect.top + targetRect.height / 2;
            const offsetPx = selectorCenter - targetCenter;
            const offsetPercent = (offsetPx / reelRect.height) * 100;

            console.log(`✅ [setSlotResult] 그리드 슬롯 실시간 위치 계산:`, {
              tier,
              targetIndex,
              targetTier: targetTierName,
              selectorCenter: Math.round(selectorCenter),
              targetCenter: Math.round(targetCenter),
              offsetPx: Math.round(offsetPx),
              offsetPercent: Math.round(offsetPercent * 100) / 100,
              reelHeight: Math.round(reelRect.height)
            });

            reel.style.transition = 'transform 0.3s ease-out';
            setTimeout(() => {
              reel.style.transform = `translateY(${offsetPercent}%)`;
              console.log(`✅ [그리드 슬롯] ${targetTierName} 위치 설정 완료: ${offsetPercent}%`);
            }, 50);
          } else {
            console.error(`❌ [setSlotResult] .grid-slot이나 .bonus-slot을 찾을 수 없음`);
            return;
          }
        } else {
          console.error(`❌ [setSlotResult] 티어 "${tier}"를 찾을 수 없음!`);
        }
      }

      function updateSlotMessage(message) {
        const messageEl = document.getElementById('slotMessage');
        if (messageEl) messageEl.textContent = message;
      }

      function updateSlotProgress(percentage) {
        const progressBar = document.querySelector('.slot-progress-bar');
        if (progressBar) progressBar.style.width = `${Math.min(percentage, 100)}%`;
      }

      async function triggerOriginalDraw() {
        console.log('슬롯머신 완료 - 원래 결과 표시 및 희귀 애니메이션 트리거');

        // 슬롯머신 상태에서 원래 뽑기 결과와 collected 데이터 가져오기
        if (slotMachineState.collectedData && slotMachineState.collectedData.length > 0) {
          const collected = slotMachineState.collectedData;
          const count = slotMachineState.drawCount || collected.length;

          console.log('수집된 데이터로 결과 표시:', { collected, count });

          // 결과 표시 (이때 renderDrawResults에서 희귀 애니메이션도 트리거됨)
          renderDrawResults(collected, count);

        } else {
          console.warn('수집된 데이터가 없습니다. 슬롯머신 상태:', slotMachineState);
        }
      }

      // Expose functions globally for mailbox.js
      window.processCouponRedemption = processCouponRedemption;
      window.applyEquipAndInventory = applyEquipAndInventory;

      // Global error popups for visibility
      (function(){
        let lastMsg = '';
        function show(msg){ if(msg && msg!==lastMsg){ lastMsg = msg; alert('오류가 발생했습니다: '+msg); setTimeout(()=>{ lastMsg=''; }, 500); } }
        window.addEventListener('error', function(e){ show(e && e.message ? e.message : String(e)); });
        window.addEventListener('unhandledrejection', function(e){ var m = (e && e.reason && e.reason.message) ? e.reason.message : String(e && e.reason || e); show(m); });
      })();
