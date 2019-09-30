/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import { Event } from 'detox-instruments-react-native-utils';
import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from 'react-native';

class example extends Component {
  constructor(props) {
    super(props);

    this._mountEvent = new Event("Performance", `Component Mount`);
    this._mountEvent.beginInterval('Example screen');

    this.state = {
      greeting: undefined
    };
  }

  componentDidMount() {
    if (this._mountEvent) {
      this._mountEvent.endInterval(Event.EventStatus.completed);
      this._mountEvent = null;
    }
  }

  render() {
    if (this.state.greeting) return this.renderAfterButton();
    return (
      <View testID='welcome' style={{flex: 1, paddingTop: 20, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{fontSize: 25, marginBottom: 30}}>
          Welcome
        </Text>
        <TouchableOpacity testID='hello_button' onPress={this.onButtonPress.bind(this, 'Hello')}>
          <Text style={{color: 'blue', marginBottom: 20}}>Say Hello</Text>
        </TouchableOpacity>
        <TouchableOpacity testID='world_button' onPress={this.onButtonPress.bind(this, 'World')}>
          <Text style={{color: 'blue', marginBottom: 20}}>Say World</Text>
        </TouchableOpacity>
        <TouchableOpacity testID='goodbye_button' onPress={this.onButtonPress.bind(this, 'Goodbye, World')}>
          <Text style={{color: 'blue', marginTop: 50, marginBottom: 20}}>Say Goodbye</Text>
        </TouchableOpacity>
      </View>
    );
  }
  renderAfterButton() {
    return (
      <View style={{flex: 1, paddingTop: 20, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{fontSize: 25}}>
          {this.state.greeting}!!!
        </Text>
      </View>
    );
  }
  onButtonPress(greeting) {
    const event = new Event("Performance", `Press handling`);
    event.beginInterval();

    this.setState({ greeting }, () => {
        event.endInterval(Event.EventStatus.completed);
    });
  }
}

AppRegistry.registerComponent('example', () => example);
