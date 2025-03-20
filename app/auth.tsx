import { Redirect } from 'expo-router';
import React from 'react';

export default function Auth(): React.ReactElement {
  return <Redirect href="/(auth)" />;
}