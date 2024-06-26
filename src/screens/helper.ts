import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {OneSignal} from 'react-native-onesignal';
import RNFetchBlob from 'rn-fetch-blob';
const deviceVersion = Platform.constants['Release'];

const requestStoragePermission = async () => {
  try {
    // Check if the platform is Android
    if (Platform.OS === 'android') {
      // Check for the permissions
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
      if (
        granted['android.permission.READ_EXTERNAL_STORAGE'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log('You can read and write to the external storage');
        return true;
      } else {
        console.log('Permission denied');
        Alert.alert(
          'Permission denied',
          'You need to grant storage permissions to use this feature.',
        );
        return false;
      }
    }
  } catch (err) {
    console.warn(err);
    return false;
  }
};

const handlePermissionAndLogin = async (userId: string) => {
  const canRequest: any = OneSignal.Notifications.canRequestPermission();
  if (canRequest) {
    await OneSignal.Notifications.requestPermission(true);
    OneSignal.login(userId);
  }
};

const downloadFileForIos = async (CSV_URL: string) => {
  try {
    const {config, fs} = RNFetchBlob;
    const date = new Date();
    const fileName = `file_${Math.floor(
      date.getTime() + date.getSeconds() / 2,
    )}.csv`;
    const filePath = `${fs.dirs.DocumentDir}/${fileName}`;
    const tempFilePath = `${fs.dirs.DocumentDir}/temp_${fileName}`;

    console.log(
      'Starting download. Temp file will be saved to: ',
      tempFilePath,
    );

    const res = await config({
      fileCache: true,
      path: tempFilePath,
      appendExt: 'csv',
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        path: tempFilePath,
        description: 'Downloading CSV file',
        mime: 'text/csv',
        mediaScannable: true,
      },
    }).fetch('GET', CSV_URL);

    const tempPath = res.path();
    console.log('Temporary file path: ', tempPath);

    // Check if the temporary file exists
    const tempFileExists = await fs.exists(tempPath);
    if (!tempFileExists) {
      throw new Error('Temporary file does not exist');
    }

    console.log('Temporary file exists. Proceeding with move operation.');

    // Check if a file with the same name already exists and delete it
    if (await fs.exists(filePath)) {
      await fs.unlink(filePath);
      console.log('Existing file deleted: ', filePath);
    }

    // Move the file to the desired location with the correct name
    await fs.mv(tempPath, filePath);
    console.log('File moved to: ', filePath);

    const fileExists = await fs.exists(filePath);
    if (fileExists) {
      console.log('The file has been saved to: ', filePath);
      RNFetchBlob.ios.previewDocument(filePath);
    } else {
      console.log('File not found at path: ', filePath);
      Alert.alert('Download Failed', 'File was not found after download.');
    }
  } catch (error) {
    console.error('Download error: ', error);
    Alert.alert(
      'Download Error',
      'An error occurred while downloading the file.',
    );
  }
};

const downloadFileForAndroid = async (CSV_URL: string) => {
  if (deviceVersion <= 12) {
    const permission = await requestStoragePermission();
    if (!permission) {
      return;
    }
  }
  try {
    const {config, fs} = RNFetchBlob;
    const date = new Date();
    const filePath = `${fs.dirs.DownloadDir}/file_${Math.floor(
      date.getTime() + date.getSeconds() / 2,
    )}.csv`;
    // Start the download
    const res = await config({
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        path: filePath,
        description: 'Downloading CSV file',
      },
    }).fetch('GET', CSV_URL);
    console.log('The file saved to ', res.path());
  } catch (error) {
    console.error('Download error', error);
  }
};

const downloadFile = async (CSV_URL: string) => {
  if (Platform.OS === 'ios') {
    return downloadFileForIos(CSV_URL);
  }
  return downloadFileForAndroid(CSV_URL);
};

export {handlePermissionAndLogin, downloadFile};
