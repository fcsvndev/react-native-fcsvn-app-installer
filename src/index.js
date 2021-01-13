import React, {
    useState,
    useEffect,
    useCallback,
    useReducer,
    useRef
} from "react";
import PropTypes from "prop-types";

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import {height, width, downloadAndInstall} from "./modules";

export const TAG = '[FCSAppInstaller]';

const fcsAppInstallerAction = {
    FETCHING: 'FETCHING',
    FETCHED: 'FETCHED',
    FETCH_ERROR: 'FETCH_ERROR',
};

const initialState = {
    message: '',
    downloadUrl: '',
    hasChecked: false,
    isFetching: false,
    hasNewVersion: false,
};

function reducer(state, action) {
    switch (action.type) {
        case fcsAppInstallerAction.FETCHING:
            return {...initialState, isFetching: true};
        case fcsAppInstallerAction.FETCHED:
            return {
                ...initialState,
                isFetching: false,
                hasChecked: true,
                message: action.payload.message,
                downloadUrl: action.payload.downloadUrl,
                hasNewVersion: action.payload.hasNewVersion
            };
        case fcsAppInstallerAction.FETCH_ERROR:
            return {...initialState, isFetching: false};
        default:
            return state;
    }
}

const FCSAppInstaller = ({
    fetchUrl,
    paramMessageNamed,
    paramStatusNamed,
    alertTitle,
    confirmBtnText,
    cancelBtnText,
    customStyles,
    allowFontScaling,
    cancellable,
    backdropStyle,
    containerStyle
}) => {
    if (!fetchUrl || !(fetchUrl.startsWith('https:') || fetchUrl.startsWith('http:'))) {
        throw new Error(`fetchUrl not correct: fetchUrl=${fetchUrl}`);
    }
    
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [state, dispatch] = useReducer(reducer, initialState);
    const timeoutId = useRef(0);
    const abortController = useRef(new AbortController());

    console.log(TAG, 'state = ', state);

    const mergedStyles = {
        backdrop: {
            ...styles.backdrop,
            ...backdropStyle,
        },
        container: {
            ...styles.container,
            ...containerStyle,
        },
    };

    const onConfirm = useCallback(async () => {
        setIsOpenModal(false)
        await downloadAndInstall(state.downloadUrl);
    }, [state]);

    const onCancel = useCallback(() => {
        return (
            setIsOpenModal(false)
        );
    }, []);

    const fetchAppStatus = async () => {
        dispatch({type: fcsAppInstallerAction.FETCHING});
        
        try {
            const response = await fetch(fetchUrl, {signal: abortController.current.signal});
            if (response.status !== 200) {
                throw new Error(JSON.stringify(response));
            }
            const data = await response.json();
            console.log(TAG, 'fetch app status success', data);
            const hasNewVersion = true;
            const payload = {
                message: 'Has new app version',
                downloadUrl: 'https://app.cosmopms.com/apps/revo_connect_preview/ios/manifest.plist',
                hasNewVersion: hasNewVersion
            };
            dispatch({type: fcsAppInstallerAction.FETCHED, payload});
            if (hasNewVersion) {
                setIsOpenModal(true)
            }
        } catch (e) {
            if (!abortController.current.signal.aborted) {
                console.log(TAG, 'fetch app status failed', e);
                dispatch({type: fcsAppInstallerAction.FETCH_ERROR});
                timeoutId.current = setTimeout(() => fetchAppStatus(), 5000);
            }
        }
    };

    useEffect(() => {
        // TODO must able cancel request
        fetchAppStatus();
        return () => {
            console.log(TAG, 'cancel request');
            clearTimeout(timeoutId.current);
            abortController.current.abort();
        };
    }, []);

    const renderButtons = () => {
        return (
            <View style={[styles.buttonView, customStyles.buttonView]}>
                <TouchableOpacity
                    onPress={onCancel}
                    style={[styles.btnText, styles.btnCancel, customStyles.btnCancel]}
                >
                    <Text
                        allowFontScaling={allowFontScaling}
                        style={[styles.btnTextText, styles.btnTextCancel, customStyles.btnTextCancel]}
                    >
                        {cancelBtnText}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onConfirm}
                    style={[styles.btnText, styles.btnConfirm, customStyles.btnConfirm]}
                >
                    <Text allowFontScaling={allowFontScaling}
                          style={[styles.btnTextText, customStyles.btnTextConfirm]}
                    >
                        {confirmBtnText}
                    </Text>
                </TouchableOpacity>
            </View>
        )
    };

    return isOpenModal ? (
        <View style={mergedStyles.backdrop}>
            <TouchableWithoutFeedback style={styles.closeTrigger} onPress={onCancel} disabled={!cancellable}>
                <View style={styles.closeContainer}/>
            </TouchableWithoutFeedback>
            <View>
                <View style={mergedStyles.container}>
                    <Text style={styles.title}>
                        {alertTitle}
                    </Text>

                    <Text style={styles.message}>
                        {state.message}
                    </Text>

                    {renderButtons()}
                </View>
            </View>
        </View>
    ) : <View/>;
};

FCSAppInstaller.defaultProps = {
    paramMessageNamed: 'message',
    paramStatusNamed: 'status',
    alertTitle: 'Alert!',
    customStyles: {},
    allowFontScaling: false,
    cancellable: false
};

FCSAppInstaller.propTypes = {
    fetchUrl: PropTypes.string,
    paramMessageNamed: PropTypes.string,
    paramStatusNamed: PropTypes.string,
    alertTitle: PropTypes.string,
    buttonStyle: PropTypes.object,
    allowFontScaling: PropTypes.bool,
    backdropStyle: PropTypes.object,
    containerStyle: PropTypes.object,
    cancellable: PropTypes.bool,
};

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: "rgba(0,0,0,0.6)",
        position: "absolute",
        width: width,
        height: height,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2147483647,
    },
    container: {
        backgroundColor: "white",
        borderRadius: 8,
        width: width * 0.85,
        padding: 16
    },
    closeTrigger: {
        width: width,
        height: height,
    },
    closeContainer: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
    buttonView: {
        justifyContent: "flex-end",
        alignItems: "center",
        flexDirection: 'row',
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
    btnTextCancel: {},
    btnCancel: {
        left: 0
    },
    btnConfirm: {
        right: 0
    },
    title: {
        textAlign: 'center',
        color: "#000000DD",
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24
    },
    message: {
        fontSize: 18,
        color: '#00000089',
        textAlign: 'center',
        marginBottom: 24
    },
});

export default FCSAppInstaller;
