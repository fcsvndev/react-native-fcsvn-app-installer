import {
    Linking
} from "react-native";
import {TAG} from "../index";

export const downloadAndInstall = async (url) => {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    return Linking.openURL(url);
  } else {
    console.log(TAG, "Don't know how to open URI: " + url);
  }
};
