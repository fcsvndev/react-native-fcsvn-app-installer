/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useState, useEffect, useCallback, useReducer} from "react";
import {
  StyleSheet,
  View,
  Text, TouchableOpacity,
} from 'react-native';
import FCSAppInstaller from "./src";

const App = () => {
  const [isAppInstallerEnabled, setIsAppInstallerEnabled] = useState(true);

  const onConfirm = useCallback(() => {
    console.log(isAppInstallerEnabled)
    setIsAppInstallerEnabled(!isAppInstallerEnabled)
  }, [isAppInstallerEnabled]);

  return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Example app react-native-fcsvn-app-installer
        </Text>
        <TouchableOpacity
            onPress={onConfirm}
            style={styles.btnText}
        >
          <Text style={styles.btnTextText}>
            Toggle
          </Text>
        </TouchableOpacity>
        {isAppInstallerEnabled && <FCSAppInstaller
            fetchUrl={'http://hl-solutions.name.vn/api/app-settings/find-all-settings'}
            confirmBtnText={'OK'}
            cancelBtnText={'Cancel'}
        />}
      </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
    },
    button: {
        borderWidth: 1,
        borderColor: '#000000',
        margin: 5,
        padding: 5,
        width: '70%',
        backgroundColor: '#DDDDDD',
        borderRadius: 5,
    },
    textField: {
        borderWidth: 1,
        borderColor: '#AAAAAA',
        margin: 5,
        padding: 5,
        width: '70%',
    },
    spacer: {
        height: 10,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 20,
        textAlign: 'center',
    },
    btnText: {
        height: 42,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    btnTextText: {
        color: "black",
        fontWeight: "normal",
        fontSize: 18,
    },
});

export default App;
