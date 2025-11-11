/**
 * Order Form Screen - Advanced Orders
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function OrderFormScreen() {
  const theme = useTheme();
  const [orderType, setOrderType] = useState<'limit' | 'stop' | 'stopLimit'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [asset, setAsset] = useState('BTC');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  const orderTypes = [
    { id: 'limit', label: 'Limit Order', description: 'Buy/sell at specific price' },
    { id: 'stop', label: 'Stop Order', description: 'Trigger market order' },
    { id: 'stopLimit', label: 'Stop-Limit', description: 'Stop with limit price' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Advanced Orders 📝</Text>

        <Card variant="elevated" style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: side === 'buy' ? theme.colors.success : theme.colors.surface.secondary }} onPress={() => setSide('buy')}>
              <Text style={{ color: side === 'buy' ? '#FFFFFF' : theme.colors.text.secondary, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: side === 'sell' ? theme.colors.error : theme.colors.surface.secondary }} onPress={() => setSide('sell')}>
              <Text style={{ color: side === 'sell' ? '#FFFFFF' : theme.colors.text.secondary, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>Sell</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12, fontWeight: '600' }}>ORDER TYPE</Text>
          {orderTypes.map((type) => (
            <TouchableOpacity key={type.id} onPress={() => setOrderType(type.id as any)} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: orderType === type.id ? theme.colors.accent.primary : theme.colors.text.tertiary, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                  {orderType === type.id && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.accent.primary }} />}
                </View>
                <View>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>{type.label}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>{type.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        <Input label="Asset" placeholder="Select asset" value={asset} onChangeText={setAsset} style={{ marginBottom: 16 }} />
        <Input label="Quantity" placeholder="0.00" value={quantity} onChangeText={setQuantity} keyboardType="numeric" style={{ marginBottom: 16 }} />
        <Input label="Limit Price" placeholder="$0.00" value={limitPrice} onChangeText={setLimitPrice} keyboardType="numeric" style={{ marginBottom: 24 }} />

        <Button title={`Place ${side === 'buy' ? 'Buy' : 'Sell'} Order`} onPress={() => {}} variant={side === 'buy' ? 'primary' : 'danger'} fullWidth />
      </ScrollView>
    </View>
  );
}
