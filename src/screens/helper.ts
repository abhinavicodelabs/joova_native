import {OneSignal} from 'react-native-onesignal';

const handlePermissionAndLogin = async (userId: string) => {
  const canRequest: any = OneSignal.Notifications.canRequestPermission();
  if (canRequest) {
    await OneSignal.Notifications.requestPermission(true);
    OneSignal.login(userId);
  }
};

export {handlePermissionAndLogin};
