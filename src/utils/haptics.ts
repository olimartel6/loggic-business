let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

export const hapticSuccess = () => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
export const hapticError = () => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Error);
export const hapticLight = () => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
export const hapticMedium = () => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
export const hapticHeavy = () => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy);
