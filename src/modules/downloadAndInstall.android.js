import RNFetchBlob from "rn-fetch-blob";
import {TAG} from "../index";

const android = RNFetchBlob.android

export const downloadAndInstall = async (url) => {
  RNFetchBlob.config({
    addAndroidDownloads: {
      useDownloadManager: true,
      title: 'FCS Installer',
      description: 'An APK that will be installed',
      mime: 'application/vnd.android.package-archive',
      mediaScannable: true,
      notification: true,
    }
  })
      .fetch('GET', 'https://drive.google.com/uc?export=download&id=1jJ7Dx41XkLoZ7mEknLCEV-QZNe7hV2Cu')
      .then(res => android.actionViewIntent(res.path(), 'application/vnd.android.package-archive'))
      .catch(err => console.log(TAG, '[downloadAndInstall] failed', err))
};
