import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { transactionsApi, accountsApi, categoriesApi } from '../lib/api';
import { todayStr } from '../lib/helpers';
import { useThemeStore } from '../store/themeStore';
import { useRefreshStore } from '../store/refreshStore';

export default function NewTransactionScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();
    const triggerRefresh = useRefreshStore(s => s.triggerRefresh);
    const [type, setType] = useState<'withdrawal' | 'deposit' | 'transfer'>('withdrawal');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [sourceId, setSourceId] = useState('');
    const [destName, setDestName] = useState('');
    const [destId, setDestId] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [date, setDate] = useState(todayStr());
    const [tags, setTags] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
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
        if (!amount || parseFloat(amount) <= 0) { Alert.alert('Errore', 'Inserisci un importo valido'); return; }
        if (!description.trim()) { Alert.alert('Errore', 'Inserisci una descrizione'); return; }
        if (!sourceId) { Alert.alert('Errore', 'Seleziona un conto'); return; }
        setSaving(true);
        try {
            const txData: any = { type, description, amount: amount.replace(',', '.'), date, source_id: sourceId, tags: tags ? tags.split(',').map(t => t.trim()) : [], notes: notes || undefined };
            if (type === 'withdrawal') { txData.destination_name = destName || 'Unknown'; if (categoryName) txData.category_name = categoryName; }
            else if (type === 'deposit') { txData.source_name = destName || 'Unknown'; txData.source_id = undefined; txData.destination_id = sourceId; if (categoryName) txData.category_name = categoryName; }
            else { txData.destination_id = destId || undefined; txData.destination_name = destId ? undefined : (destName || 'Unknown'); }
            await transactionsApi.create({ transactions: [txData] });
            triggerRefresh();
            Alert.alert('Successo', 'Transazione salvata!', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e: any) { Alert.alert('Errore', e?.response?.data?.message || 'Impossibile salvare'); }
        finally { setSaving(false); }
    };

    const TYPES = [
        { key: 'withdrawal' as const, label: 'Uscita', icon: 'arrow-upward', color: c.danger },
        { key: 'deposit' as const, label: 'Entrata', icon: 'arrow-downward', color: c.success },
        { key: 'transfer' as const, label: 'Trasferimento', icon: 'sync-alt', color: c.textSecondary },
    ];

    if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={c.primary} /></View>;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="close" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Nuova Transazione</Text>
                <TouchableOpacity onPress={handleSave} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={c.primary} /> : <MaterialIcons name="check" size={24} color={c.primary} />}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ backgroundColor: c.primaryBg, paddingVertical: 32, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 4 }}>Importo</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={{ color: c.primary, fontSize: 24, fontWeight: '800', marginRight: 4 }}>€</Text>
                        <TextInput style={{ color: c.primary, fontSize: 48, fontWeight: '800', minWidth: 100, textAlign: 'center' }} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={c.textMuted} />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
                    {TYPES.map(t => (
                        <TouchableOpacity key={t.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: type === t.key ? t.color : c.border, backgroundColor: type === t.key ? t.color + '22' : c.bgCard }} onPress={() => setType(t.key)}>
                            <MaterialIcons name={t.icon as any} size={18} color={type === t.key ? t.color : c.textMuted} />
                            <Text style={{ color: type === t.key ? t.color : c.textMuted, fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}>
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Descrizione</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                            <MaterialIcons name="edit" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Cosa hai acquistato?" placeholderTextColor={c.textMuted} value={description} onChangeText={setDescription} />
                        </View>
                    </View>

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

                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{type === 'deposit' ? 'Provenienza' : type === 'transfer' ? 'Conto destinazione' : 'Destinazione spesa'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                            <MaterialIcons name="shopping-cart" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Es. Supermercato" placeholderTextColor={c.textMuted} value={destName} onChangeText={setDestName} />
                        </View>
                    </View>

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

                    {[
                        { label: 'Data', icon: 'calendar-today', value: date, set: setDate, placeholder: 'YYYY-MM-DD' },
                        { label: 'Tag', icon: 'sell', value: tags, set: setTags, placeholder: 'Separati da virgola' },
                    ].map(f => (
                        <View key={f.label} style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                <MaterialIcons name={f.icon as any} size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder={f.placeholder} placeholderTextColor={c.textMuted} value={f.value} onChangeText={f.set} />
                            </View>
                        </View>
                    ))}

                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Note</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 80, paddingTop: 12 }}>
                            <MaterialIcons name="notes" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: 60, textAlignVertical: 'top' }} placeholder="Note aggiuntive..." placeholderTextColor={c.textMuted} value={notes} onChangeText={setNotes} multiline />
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: c.bg + 'F2', borderTopWidth: 1, borderTopColor: c.border }}>
                <TouchableOpacity style={[{ backgroundColor: c.primary, height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 6 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <><MaterialIcons name="save" size={20} color="white" /><Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Salva Transazione</Text></>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
