import { Text } from './Themed';
import type { TextProps } from 'react-native';

export function MonoText(props: TextProps) {
  return <Text {...props} style={props.style} />;
}
