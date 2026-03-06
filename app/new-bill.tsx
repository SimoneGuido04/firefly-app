import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { billsApi } from '../lib/api';
import { todayStr } from '../lib/helpers';
import { useRefreshStore } from '../store/refreshStore';
import { useThemeStore } from '../store/themeStore';

const REPEAT_FREQS = [
    { key: 'weekly', label: 'Settimanale' },
    { key: 'monthly', label: 'Mensile' },
    { key: 'quarterly', label: 'Trimestrale' },
    { key: 'half-year', label: 'Semestrale' },
    { key: 'yearly', label: 'Annuale' },
];

export default function NewBillScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const triggerRefresh = useRefreshStore(s => s.triggerRefresh);

    const [name, setName] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [date, setDate] = useState(todayStr());
    const [repeatFreq, setRepeatFreq] = useState('monthly');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Errore', 'Inserisci un nome'); return; }
        if (!amountMin || parseFloat(amountMin) <= 0) { Alert.alert('Errore', 'Inserisci un importo minimo'); return; }
        if (!amountMax || parseFloat(amountMax) <= 0) { Alert.alert('Errore', 'Inserisci un importo massimo'); return; }
        setSaving(true);
        try {
            await billsApi.create({
                name: name.trim(),
                amount_min: amountMin.replace(',', '.'),
                amount_max: amountMax.replace(',', '.'),
                date: date,
                repeat_freq: repeatFreq,
                end_date: endDate || undefined,
                notes: notes || undefined,
            });
            triggerRefresh();
            Alert.alert('Successo', 'Bolletta creata!', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e: any) {
            console.error(e?.response?.data || e);
            Alert.alert('Errore', e?.response?.data?.message || 'Impossibile creare');
        } finally { setSaving(false); }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="close" size={24} color={c.text} />
                    </TouchableOpacity>
                    <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Nuova Bolletta</Text>
                    <TouchableOpacity onPress={handleSave} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} disabled={saving}>
                        {saving ? <ActivityIndicator size="small" color={c.primary} /> : <MaterialIcons name="check" size={24} color={c.primary} />}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Amount Hero - Min/Max side by side */}
                    <View style={{ backgroundColor: c.primaryBg, paddingVertical: 24, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 4 }}>Importo Min.</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={{ color: c.primary, fontSize: 18, fontWeight: '800', marginRight: 2 }}>€</Text>
                                    <TextInput style={{ color: c.primary, fontSize: 32, fontWeight: '800', minWidth: 60, textAlign: 'center' }}
                                        value={amountMin} onChangeText={setAmountMin} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.textMuted} />
                                </View>
                            </View>
                            <View style={{ width: 1, backgroundColor: c.border }} />
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 4 }}>Importo Max.</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={{ color: c.primary, fontSize: 18, fontWeight: '800', marginRight: 2 }}>€</Text>
                                    <TextInput style={{ color: c.primary, fontSize: 32, fontWeight: '800', minWidth: 60, textAlign: 'center' }}
                                        value={amountMax} onChangeText={setAmountMax} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.textMuted} />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 16, gap: 16, paddingTop: 16, paddingBottom: 24 }}>
                        {/* Name */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Nome</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                <MaterialIcons name="receipt-long" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Es. Bolletta luce, Affitto" placeholderTextColor={c.textMuted} value={name} onChangeText={setName} />
                            </View>
                        </View>

                        {/* Frequency */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Frequenza</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {REPEAT_FREQS.map(f => (
                                    <TouchableOpacity key={f.key} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: repeatFreq === f.key ? c.primary : c.border, backgroundColor: repeatFreq === f.key ? c.primary : c.bgCard }} onPress={() => setRepeatFreq(f.key)}>
                                        <Text style={{ color: repeatFreq === f.key ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Dates */}
                        {[
                            { label: 'Prima scadenza', icon: 'event', value: date, set: setDate, placeholder: 'YYYY-MM-DD' },
                            { label: 'Data fine (opzionale)', icon: 'event-busy', value: endDate, set: setEndDate, placeholder: 'YYYY-MM-DD' },
                        ].map(f => (
                            <View key={f.label} style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name={f.icon as any} size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder={f.placeholder} placeholderTextColor={c.textMuted} value={f.value} onChangeText={f.set} />
                                </View>
                            </View>
                        ))}

                        {/* Notes */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Note</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 80, paddingTop: 12 }}>
                                <MaterialIcons name="notes" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: 60, textAlignVertical: 'top' }} placeholder="Note..." placeholderTextColor={c.textMuted} value={notes} onChangeText={setNotes} multiline />
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: c.bg + 'F2', borderTopWidth: 1, borderTopColor: c.border }}>
                    <TouchableOpacity style={[{ backgroundColor: c.primary, height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 6 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                        {saving ? <ActivityIndicator color="white" /> : <><MaterialIcons name="receipt-long" size={20} color="white" /><Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Crea Bolletta</Text></>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
