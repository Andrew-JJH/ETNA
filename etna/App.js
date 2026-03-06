import { Image } from 'react-native';

const LogoEtna = () => (
  <Image
    source={require('./assets/images/logo-full.png')}
    style={{ width: 35, height: 35, marginRight: 15 }}
    resizeMode="contain"
  />
);