/**
 * tree.js — Habitly daraxt logikasi
 * Versiya: 2.0
 */
const HabitTree = (() => {

  const STAGES = [
    { id: 0, name: "Urug'",         minEff: 0,  leafCount: 0,  trunkH: 0.08, canopyR: 0.00 },
    { id: 1, name: "Kichik nihol",  minEff: 20, leafCount: 5,  trunkH: 0.26, canopyR: 0.16 },
    { id: 2, name: "O'sayotgan",    minEff: 40, leafCount: 14, trunkH: 0.44, canopyR: 0.28 },
    { id: 3, name: "Katta daraxt",  minEff: 60, leafCount: 24, trunkH: 0.60, canopyR: 0.40 },
    { id: 4, name: "To'liq daraxt", minEff: 80, leafCount: 36, trunkH: 0.76, canopyR: 0.52 },
  ];

  function computeState({ efficiency = 0, streak = 0, missedDays = 0 }) {
    const eff    = Math.max(0, Math.min(100, efficiency));
    const str    = Math.max(0, streak);
    const missed = Math.max(0, missedDays);

    let stageIdx = 0;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (eff >= STAGES[i].minEff) { stageIdx = i; break; }
    }
    const stage = STAGES[stageIdx];

    const streakBonus   = Math.min(0.30, Math.floor(str / 5) * 0.06);
    const missedPenalty = Math.min(0.45, missed * 0.09);

    const growth = Math.max(0, Math.min(1,
      (eff / 100) * (1 + streakBonus) * (1 - missedPenalty)
    ));

    const leafHealth = Math.max(0, 1 - missedPenalty * 1.6);

    const fruitCount = str >= 5
      ? Math.min(14, 1 + Math.floor(str / 5) + Math.floor(str / 10) * 2)
      : 0;

    const leafCount = Math.max(0, Math.round(
      stage.leafCount * (1 + streakBonus * 0.5) * (1 - missedPenalty * 0.5)
    ));

    const trunkH  = Math.max(0.05, Math.min(0.88, stage.trunkH  + streakBonus * 0.07 - missedPenalty * 0.04));
    const canopyR = Math.max(0.00, Math.min(0.60, stage.canopyR + streakBonus * 0.05 - missedPenalty * 0.03));

    return {
      stageIdx, stageName: stage.name,
      growth: +growth.toFixed(3),
      leafCount,
      leafHealth: +leafHealth.toFixed(3),
      fruitCount,
      trunkH: +trunkH.toFixed(3),
      canopyR: +canopyR.toFixed(3),
      streakBonus, missedPenalty,
      efficiency: eff, streak: str, missedDays: missed,
    };
  }

  function getStatusMessage(state) {
    if (state.missedDays >= 3)   return "Daraxt qurib qolmasin — bugun odat bajaring!";
    if (state.streak >= 30)      return "30 kunlik zanjir! Siz haqiqiy qahramonssiz!";
    if (state.streak >= 14)      return "14 kun! Mevalar ko'paymoqda.";
    if (state.streak >= 7)       return "Bir haftalik zanjir! Ajoyib!";
    if (state.streak >= 5)       return "5 kunlik streak — birinchi mevalar!";
    if (state.efficiency >= 80)  return "Zo'r natija! Daraxtingiz gullab-yashnayapti.";
    if (state.efficiency >= 60)  return "Yaxshi borpasiz — katta daraxt o'smoqda!";
    if (state.efficiency >= 40)  return "Davom eting — daraxt o'sib bormoqda.";
    if (state.efficiency >= 20)  return "Nihol unib chiqdi! Har kuni sug'oring.";
    return "Birinchi odatni bajaring — daraxt o'sadi!";
  }

  function getNextGoal(state) {
    if (state.stageIdx === 4 && state.streak >= 20) return "Eng yuqori darajaga yettingiz!";
    if (state.efficiency < 20)  return "Keyingi bosqich: " + (20 - state.efficiency) + "% ko'proq samaradorlik";
    if (state.efficiency < 40)  return "Keyingi bosqich: " + (40 - state.efficiency) + "% ko'proq samaradorlik";
    if (state.efficiency < 60)  return "Keyingi bosqich: " + (60 - state.efficiency) + "% ko'proq samaradorlik";
    if (state.efficiency < 80)  return "Keyingi bosqich: " + (80 - state.efficiency) + "% ko'proq samaradorlik";
    if (state.streak < 5)       return "Meva uchun: " + (5 - state.streak) + " kun streak kerak";
    return state.fruitCount + " ta meva — streak oshirish bilan ko'payadi";
  }

  return { computeState, getStatusMessage, getNextGoal, STAGES };
})();
