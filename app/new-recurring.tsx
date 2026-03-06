import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountsApi, categoriesApi, recurringApi } from '../lib/api';
import { todayStr } from '../lib/helpers';
import { useRefreshStore } from '../store/refreshStore';
import { useThemeStore } from '../store/themeStore';

const REPEAT_FREQS = [
    { key: 'daily', label: 'Giornaliera' },
    { key: 'weekly', label: 'Settimanale' },
    { key: 'monthly', label: 'Mensile' },
    { key: 'quarterly', label: 'Trimestrale' },
    { key: 'half-year', label: 'Semestrale' },
    { key: 'yearly', label: 'Annuale' },
];

export default function NewRecurringScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const triggerRefresh = useRefreshStore(s => s.triggerRefresh);

    const [type, setType] = useState<'withdrawal' | 'deposit' | 'transfer'>('withdrawal');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [firstDate, setFirstDate] = useState(todayStr());
    const [repeatFreq, setRepeatFreq] = useState('monthly');
    const [sourceId, setSourceId] = useState('');
    const [destName, setDestName] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [notes, setNotes] = useState('');
    const [endDate, setEndDate] = useState('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [accRes, catRes] = await Promise.all([accountsApi.list('asset'), categoriesApi.list()]);
                if (accRes.data?.data) { setAccounts(accRes.data.data); if (accRes.data.data.length > 0) setSourceId(accRes.data.data[0].id); }
                if (catRes.data?.data) setCategories(catRes.data.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const handleSave = async () => {
        if (!title.trim()) { Alert.alert('Errore', 'Inserisci un titolo'); return; }
        if (!amount || parseFloat(amount) <= 0) { Alert.alert('Errore', 'Inserisci un importo'); return; }
        if (!sourceId) { Alert.alert('Errore', 'Seleziona un conto'); return; }
        setSaving(true);
        try {
            const txData: any = {
                type,
                description: description || title,
                amount: amount.replace(',', '.'),
                source_id: sourceId,
            };
            if (type === 'withdrawal') {
                txData.destination_name = destName || 'Unknown';
                if (categoryName) txData.category_name = categoryName;
            } else if (type === 'deposit') {
                txData.source_name = destName || 'Unknown';
                txData.source_id = undefined;
                txData.destination_id = sourceId;
                if (categoryName) txData.category_name = categoryName;
            } else {
                txData.destination_name = destName || 'Unknown';
            }

            await recurringApi.create({
                title: title.trim(),
                first_date: firstDate,
                repeat_freq: repeatFreq,
                end_date: endDate || undefined,
                notes: notes || undefined,
                active: true,
                apply_rules: true,
                transactions: [txData],
                repetitions: [{ type: repeatFreq, moment: '' }],
            });
            triggerRefresh();
            Alert.alert('Successo', 'Ricorrenza creata!', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e: any) {
            console.error(e?.response?.data || e);
            Alert.alert('Errore', e?.response?.data?.message || 'Impossibile creare');
        } finally { setSaving(false); }
    };

    const TYPES = [
        { key: 'withdrawal' as const, label: 'Uscita', icon: 'arrow-upward', color: c.danger },
        { key: 'deposit' as const, label: 'Entrata', icon: 'arrow-downward', color: c.success },
        { key: 'transfer' as const, label: 'Trasferimento', icon: 'sync-alt', color: c.textSecondary },
    ];

    if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View>;

    const amountColor = type === 'withdrawal' ? c.danger : type === 'deposit' ? c.success : c.primary;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="close" size={24} color={c.text} />
                    </TouchableOpacity>
                    <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Nuova Ricorrenza</Text>
                    <TouchableOpacity onPress={handleSave} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} disabled={saving}>
                        {saving ? <ActivityIndicator size="small" color={c.primary} /> : <MaterialIcons name="check" size={24} color={c.primary} />}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Amount Hero */}
                    <View style={{ backgroundColor: c.primaryBg, paddingVertical: 32, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 4 }}>Importo</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ color: amountColor, fontSize: 24, fontWeight: '800', marginRight: 4 }}>€</Text>
                            <TextInput style={{ color: amountColor, fontSize: 48, fontWeight: '800', minWidth: 100, textAlign: 'center' }}
                                value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={c.textMuted} />
                        </View>
                    </View>

                    {/* Type Selector */}
                    <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
                        {TYPES.map(tp => (
                            <TouchableOpacity key={tp.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: type === tp.key ? tp.color : c.border, backgroundColor: type === tp.key ? tp.color + '22' : c.bgCard }} onPress={() => setType(tp.key)}>
                                <MaterialIcons name={tp.icon as any} size={18} color={type === tp.key ? tp.color : c.textMuted} />
                                <Text style={{ color: type === tp.key ? tp.color : c.textMuted, fontSize: 12, fontWeight: '700' }}>{tp.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}>
                        {/* Title */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Titolo</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                <MaterialIcons name="title" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Es. Abbonamento Netflix" placeholderTextColor={c.textMuted} value={title} onChangeText={setTitle} />
                            </View>
                        </View>

                        {/* Description */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Descrizione transazione</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                <MaterialIcons name="edit" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Descrizione" placeholderTextColor={c.textMuted} value={description} onChangeText={setDescription} />
                            </View>
                        </View>

                        {/* Account */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{type === 'deposit' ? 'Conto destinazione' : 'Conto di origine'}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {accounts.map(acc => (
                                    <TouchableOpacity key={acc.id} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: sourceId === acc.id ? c.primary : c.border, backgroundColor: sourceId === acc.id ? c.primary : c.bgCard }} onPress={() => setSourceId(acc.id)}>
                                        <Text style={{ color: sourceId === acc.id ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{acc.attributes.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Destination */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{type === 'deposit' ? 'Provenienza' : 'Destinazione'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                <MaterialIcons name="shopping-cart" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Es. Netflix" placeholderTextColor={c.textMuted} value={destName} onChangeText={setDestName} />
                            </View>
                        </View>

                        {/* Category */}
                        {type !== 'transfer' && (
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Categoria</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    <TouchableOpacity style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: !categoryName ? c.primary : c.border, backgroundColor: !categoryName ? c.primary : c.bgCard }} onPress={() => setCategoryName('')}>
                                        <Text style={{ color: !categoryName ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>Nessuna</Text>
                                    </TouchableOpacity>
                                    {categories.map(cat => (
                                        <TouchableOpacity key={cat.id} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: categoryName === cat.attributes.name ? c.primary : c.border, backgroundColor: categoryName === cat.attributes.name ? c.primary : c.bgCard }} onPress={() => setCategoryName(cat.attributes.name)}>
                                            <Text style={{ color: categoryName === cat.attributes.name ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{cat.attributes.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

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
                            { label: 'Prima occorrenza', icon: 'event', value: firstDate, set: setFirstDate, placeholder: 'YYYY-MM-DD' },
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
                        {saving ? <ActivityIndicator color="white" /> : <><MaterialIcons name="repeat" size={20} color="white" /><Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Crea Ricorrenza</Text></>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
