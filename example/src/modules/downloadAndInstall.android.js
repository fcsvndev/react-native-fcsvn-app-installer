import { NativeModules } from 'react-native';
import {TAG} from "../index";

const {FCSInstallerModule} = NativeModules;

export const downloadAndInstall = async (url) => {
  console.log('ANDROID')
  try {
    const fileUri = await FCSInstallerModule.downloadAndInstall(
        'https://drive.google.com/uc?export=download&id=1jJ7Dx41XkLoZ7mEknLCEV-QZNe7hV2Cu',
        "com.fcscs.mHousekeeping_v3.5.2026.386-general-release.apk",
        {smallIcon: "ic_launcher"}
    );
    console.log(TAG, "download success", fileUri);
  } catch (e) {
    console.log(TAG, "download failed", e);
  }
};
