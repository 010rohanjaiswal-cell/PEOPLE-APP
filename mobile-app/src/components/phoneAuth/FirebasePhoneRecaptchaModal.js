/**
 * ApplicationVerifier for Firebase PhoneAuthProvider — replaces expo-firebase-recaptcha (SDK 54+).
 */
import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  SafeAreaView,
  Text,
  Button,
  ActivityIndicator,
} from 'react-native';
import FirebasePhoneRecaptcha from './FirebasePhoneRecaptcha';

function makeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

export default class FirebasePhoneRecaptchaModal extends React.Component {
  static defaultProps = {
    title: 'reCAPTCHA',
    cancelLabel: 'Cancel',
  };

  state = {
    visible: false,
    visibleLoaded: false,
    invisibleLoaded: false,
    invisibleVerify: false,
    invisibleKey: 1,
    resolve: undefined,
    reject: undefined,
  };

  static getDerivedStateFromProps(props, state) {
    if (!props.attemptInvisibleVerification && state.invisibleLoaded) {
      return {
        invisibleLoaded: false,
        invisibleVerify: false,
      };
    }
    return null;
  }

  get type() {
    return 'recaptcha';
  }

  async verify() {
    return new Promise((resolve, reject) => {
      if (this.props.attemptInvisibleVerification) {
        this.setState({
          invisibleVerify: true,
          resolve,
          reject,
        });
      } else {
        this.setState({
          visible: true,
          visibleLoaded: false,
          resolve,
          reject,
        });
      }
    });
  }

  _reset() {}

  onVisibleLoad = () => {
    this.setState({ visibleLoaded: true });
  };

  onInvisibleLoad = () => {
    this.setState({ invisibleLoaded: true });
  };

  onFullChallenge = async () => {
    this.setState({
      invisibleVerify: false,
      visible: true,
    });
  };

  onError = () => {
    const { reject } = this.state;
    if (reject) {
      reject(makeError('ERR_FIREBASE_RECAPTCHA_ERROR', 'Failed to load reCAPTCHA'));
    }
    this.setState({
      visible: false,
      invisibleVerify: false,
    });
  };

  onVerify = (token) => {
    const { resolve } = this.state;
    if (resolve) {
      resolve(token);
    }
    this.setState((s) => ({
      visible: false,
      invisibleVerify: false,
      invisibleLoaded: false,
      invisibleKey: s.invisibleKey + 1,
    }));
  };

  cancel = () => {
    const { reject } = this.state;
    if (reject) {
      reject(makeError('ERR_FIREBASE_RECAPTCHA_CANCEL', 'Cancelled by user'));
    }
    this.setState({ visible: false });
  };

  render() {
    const { title, cancelLabel, attemptInvisibleVerification, ...otherProps } = this.props;
    const { visible, visibleLoaded, invisibleLoaded, invisibleVerify, invisibleKey } = this.state;

    return (
      <View style={styles.container}>
        {attemptInvisibleVerification && (
          <FirebasePhoneRecaptcha
            {...otherProps}
            key={`invisible${invisibleKey}`}
            style={styles.invisible}
            onLoad={this.onInvisibleLoad}
            onError={this.onError}
            onVerify={this.onVerify}
            onFullChallenge={this.onFullChallenge}
            invisible
            verify={invisibleLoaded && invisibleVerify}
          />
        )}
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={this.cancel}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.cancel}>
                <Button title={cancelLabel || FirebasePhoneRecaptchaModal.defaultProps.cancelLabel} onPress={this.cancel} />
              </View>
            </View>
            <View style={styles.content}>
              <FirebasePhoneRecaptcha
                {...otherProps}
                style={styles.content}
                onLoad={this.onVisibleLoad}
                onError={this.onError}
                onVerify={this.onVerify}
              />
              {!visibleLoaded ? (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" />
                </View>
              ) : null}
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: 0,
    height: 0,
  },
  invisible: {
    width: 300,
    height: 300,
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FBFBFB',
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: '#CECECE',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontWeight: 'bold',
  },
  cancel: {
    position: 'absolute',
    left: 8,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});
