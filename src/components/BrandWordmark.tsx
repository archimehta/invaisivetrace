import React from 'react';
import { Text, View } from 'react-native';

/** A compact wordmark with a pair of curling leafy vines framing the AI. */
export function BrandWordmark() {
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{ fontSize: 21, color: '#FFFDF3', fontWeight: '700', letterSpacing: .1 }}>Inv</Text>
    <View style={{ width: 27, height: 30, justifyContent: 'center', alignItems: 'center', marginHorizontal: -2 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 27, height: 30 }}>
        {/* Fine angled tendril curls around the edges of the AI without crossing the glyphs. */}
        <View style={{ position: 'absolute', left: 2, top: 8, width: 1.2, height: 15, borderRadius: 2, backgroundColor: '#A9C98E', transform: [{ rotate: '-12deg' }] }} />
        <View style={{ position: 'absolute', right: 2, top: 10, width: 1.2, height: 15, borderRadius: 2, backgroundColor: '#A9C98E', transform: [{ rotate: '12deg' }] }} />
        <View style={{ position: 'absolute', left: 2, top: 8, width: 8, height: 1.2, borderRadius: 2, backgroundColor: '#A9C98E', transform: [{ rotate: '-28deg' }] }} />
        <View style={{ position: 'absolute', right: 2, bottom: 7, width: 8, height: 1.2, borderRadius: 2, backgroundColor: '#A9C98E', transform: [{ rotate: '-28deg' }] }} />
        <View style={{ position: 'absolute', left: 0, top: 4, width: 5, height: 3, borderTopLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: '#A9C98E', transform: [{ rotate: '-34deg' }] }} />
        <View style={{ position: 'absolute', right: 0, bottom: 4, width: 5, height: 3, borderTopLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: '#A9C98E', transform: [{ rotate: '34deg' }] }} />
        <View style={{ position: 'absolute', left: 1, top: 24, width: 3, height: 3, borderRadius: 3, backgroundColor: '#E7C77A' }} />
        <View style={{ position: 'absolute', right: 1, top: 2, width: 3, height: 3, borderRadius: 3, backgroundColor: '#E7C77A' }} />
      </View>
      <Text style={{ fontSize: 21, color: '#B9D49F', fontWeight: '900', zIndex: 1 }}>AI</Text>
    </View>
    <Text style={{ fontSize: 21, color: '#FFFDF3', fontWeight: '700', letterSpacing: .1 }}>sive Trace</Text>
  </View>;
}
