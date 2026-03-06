import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountsApi, categoriesApi, recurringApi } from '../../lib/api';
import { formatCurrency, formatDate, todayStr } from '../../lib/helpers';
import { useRefreshStore } from '../../store/refreshStore';
import { useThemeStore } from '../../store/themeStore';

const REPEAT_FREQS = [
    { key: 'daily', label: 'Giornaliera' },
    { key: 'weekly', label: 'Settimanale' },
    { key: 'monthly', label: 'Mensile' },
    { key: 'quarterly', label: 'Trimestrale' },
    { key: 'half-year', label: 'Semestrale' },
    { key: 'yearly', label: 'Annuale' },
];

export default function RecurringDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: c } = useThemeStore();
    const triggerRefresh = useRefreshStore(s => s.triggerRefresh);

    const [rec, setRec] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Edit state
    const [editType, setEditType] = useState<'withdrawal' | 'deposit' | 'transfer'>('withdrawal');
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editSourceId, setEditSourceId] = useState('');
    const [editDestName, setEditDestName] = useState('');

    // Recurrence specfic state
    const [editFirstDate, setEditFirstDate] = useState('');
    const [editRepeatFreq, setEditRepeatFreq] = useState('monthly');
    const [editActive, setEditActive] = useState(true);

    // Lists for pickers
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            const [recRes, accRes, catRes] = await Promise.all([
                recurringApi.get(id),
                accountsApi.list('asset'),
                categoriesApi.list(),
            ]);
            if (accRes.data?.data) setAccounts(accRes.data.data);
            if (catRes.data?.data) setCategories(catRes.data.data);
            if (recRes.data?.data) {
                const data = recRes.data.data;
                setRec(data);
                const a = data.attributes;
                const tx = a.transactions?.[0];

                setEditTitle(a.title || '');
                setEditFirstDate(a.first_date?.split('T')[0] || todayStr());
                setEditRepeatFreq(a.repeat_freq || a.repetitions?.[0]?.type || 'monthly');
                setEditActive(a.active || false);
                setEditNotes(a.notes || '');

                if (tx) {
                    setEditType(a.type || tx.type || 'withdrawal');
                    setEditDesc(tx.description || '');
                    setEditAmount(tx.amount ? parseFloat(tx.amount).toString() : a.amount ? parseFloat(a.amount).toString() : '');
                    setEditCategory(tx.category_name || '');
                    setEditSourceId(tx.source_id?.toString() || '');
                    setEditDestName(tx.destination_name || tx.source_name || '');
                } else {
                    setEditDesc(a.title || '');
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!rec) return;
        if (!editTitle.trim()) { Alert.alert('Errore', 'Inserisci un titolo'); return; }
        if (!editAmount || parseFloat(editAmount) <= 0) { Alert.alert('Errore', 'Importo non valido'); return; }
        if (editType !== 'deposit' && !editSourceId) { Alert.alert('Errore', 'Seleziona un conto'); return; }
        setSaving(true);
        try {
            const txData: any = {
                type: editType,
                description: editDesc || editTitle,
                amount: editAmount.replace(',', '.'),
            };
            if (editType === 'withdrawal') {
                txData.source_id = editSourceId;
                txData.destination_name = editDestName || 'Unknown';
                if (editCategory) txData.category_name = editCategory;
            } else if (editType === 'deposit') {
                txData.source_name = editDestName || 'Unknown';
                txData.destination_id = editSourceId;
                if (editCategory) txData.category_name = editCategory;
            } else {
                txData.source_id = editSourceId;
                txData.destination_name = editDestName || 'Unknown';
            }

            const dataToUpdate = {
                title: editTitle.trim(),
                first_date: editFirstDate,
                repeat_freq: editRepeatFreq,
                notes: editNotes || undefined,
                active: editActive,
                apply_rules: true,
                transactions: [txData],
                repetitions: [{ type: editRepeatFreq, moment: '' }],
            };

            await recurringApi.update(rec.id, dataToUpdate);
            triggerRefresh();
            Alert.alert('Successo', 'Ricorrenza aggiornata!');
            setEditing(false);
            setLoading(true);
            await load();
        } catch (e: any) {
            console.error(e?.response?.data || e);
            Alert.alert('Errore', e?.response?.data?.message || 'Impossibile aggiornare');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Elimina ricorrenza', 'Sei sicuro? Questa azione non fermerà le transazioni passate ma impedirà quelle future.', [
            { text: 'Annulla', style: 'cancel' },
            {
                text: 'Elimina', style: 'destructive', onPress: async () => {
                    setDeleting(true);
                    try {
                        await recurringApi.delete(rec.id);
                        triggerRefresh();
                        Alert.alert('Eliminata', 'Ricorrenza eliminata.', [{ text: 'OK', onPress: () => router.back() }]);
                    } catch (e: any) {
                        Alert.alert('Errore', e?.response?.data?.message || 'Impossibile eliminare');
                    } finally { setDeleting(false); }
                }
            },
        ]);
    };

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={c.primary} />
        </View>
    );

    if (!rec) return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="error-outline" size={48} color={c.danger} />
            <Text style={{ color: c.text, fontSize: 16, marginTop: 12 }}>Ricorrenza non trovata</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={{ color: c.primary, fontSize: 14, fontWeight: '700' }}>Torna indietro</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );

    const a = rec.attributes;
    const t = a.transactions?.[0];
    const type = a.type || t?.type || 'withdrawal';
    const isExpense = type === 'withdrawal';
    const isDeposit = type === 'deposit';
    const amountColor = isExpense ? c.danger : isDeposit ? c.success : c.textSecondary;
    const amountPrefix = isExpense ? '-' : isDeposit ? '+' : '';
    const typeLabel = isExpense ? 'Uscita' : isDeposit ? 'Entrata' : 'Trasferimento';
    const typeIcon = isExpense ? 'arrow-upward' : isDeposit ? 'arrow-downward' : 'sync-alt';

    const TYPES = [
        { key: 'withdrawal' as const, label: 'Uscita', icon: 'arrow-upward', color: c.danger },
        { key: 'deposit' as const, label: 'Entrata', icon: 'arrow-downward', color: c.success },
        { key: 'transfer' as const, label: 'Trasferimento', icon: 'sync-alt', color: c.textSecondary },
    ];

    const getFreqLabel = (freq: string) => {
        const item = REPEAT_FREQS.find(f => f.key === freq);
        return item ? item.label : freq;
    };

    // ============ EDIT MODE ============
    if (editing) {
        const editAmountColor = editType === 'withdrawal' ? c.danger : editType === 'deposit' ? c.success : c.primary;
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
                <Stack.Screen options={{ headerShown: false }} />
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                        <TouchableOpacity onPress={() => setEditing(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialIcons name="close" size={24} color={c.text} />
                        </TouchableOpacity>
                        <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Modifica Ricorrenza</Text>
                        <TouchableOpacity onPress={handleSave} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color={c.primary} /> : <MaterialIcons name="check" size={24} color={c.primary} />}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                        <View style={{ backgroundColor: c.primaryBg, paddingVertical: 32, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 4 }}>Importo</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={{ color: editAmountColor, fontSize: 24, fontWeight: '800', marginRight: 4 }}>€</Text>
                                <TextInput style={{ color: editAmountColor, fontSize: 48, fontWeight: '800', minWidth: 100, textAlign: 'center' }}
                                    value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={c.textMuted} />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
                            {TYPES.map(tp => (
                                <TouchableOpacity key={tp.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: editType === tp.key ? tp.color : c.border, backgroundColor: editType === tp.key ? tp.color + '22' : c.bgCard }} onPress={() => setEditType(tp.key)}>
                                    <MaterialIcons name={tp.icon as any} size={18} color={editType === tp.key ? tp.color : c.textMuted} />
                                    <Text style={{ color: editType === tp.key ? tp.color : c.textMuted, fontSize: 12, fontWeight: '700' }}>{tp.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}>
                            {/* Title & Desc */}
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Titolo Ricorrenza</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="title" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Titolo" placeholderTextColor={c.textMuted} value={editTitle} onChangeText={setEditTitle} />
                                </View>
                            </View>
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Descrizione transazione</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="edit" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Descrizione transazione" placeholderTextColor={c.textMuted} value={editDesc} onChangeText={setEditDesc} />
                                </View>
                            </View>

                            {/* Active Toggle */}
                            <TouchableOpacity onPress={() => setEditActive(!editActive)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <MaterialIcons name={editActive ? "check-circle" : "pause-circle-outline"} size={22} color={editActive ? c.success : c.textMuted} />
                                    <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{editActive ? 'Attiva' : 'Inattiva'}</Text>
                                </View>
                                <Text style={{ color: c.textSecondary, fontSize: 12 }}>{editActive ? 'Verrà processata' : 'In pausa'}</Text>
                            </TouchableOpacity>

                            {/* Account & Category */}
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{editType === 'deposit' ? 'Conto destinazione' : 'Conto di origine'}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    {accounts.map(acc => (
                                        <TouchableOpacity key={acc.id} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: editSourceId === acc.id.toString() ? c.primary : c.border, backgroundColor: editSourceId === acc.id.toString() ? c.primary : c.bgCard }} onPress={() => setEditSourceId(acc.id.toString())}>
                                            <Text style={{ color: editSourceId === acc.id.toString() ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{acc.attributes.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{editType === 'deposit' ? 'Provenienza' : editType === 'transfer' ? 'Conto destinazione' : 'Destinazione spesa'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="shopping-cart" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Es. Netflix" placeholderTextColor={c.textMuted} value={editDestName} onChangeText={setEditDestName} />
                                </View>
                            </View>

                            {editType !== 'transfer' && (
                                <View style={{ gap: 8 }}>
                                    <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Categoria</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                        <TouchableOpacity style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: !editCategory ? c.primary : c.border, backgroundColor: !editCategory ? c.primary : c.bgCard }} onPress={() => setEditCategory('')}>
                                            <Text style={{ color: !editCategory ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>Nessuna</Text>
                                        </TouchableOpacity>
                                        {categories.map(cat => (
                                            <TouchableOpacity key={cat.id} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: editCategory === cat.attributes.name ? c.primary : c.border, backgroundColor: editCategory === cat.attributes.name ? c.primary : c.bgCard }} onPress={() => setEditCategory(cat.attributes.name)}>
                                                <Text style={{ color: editCategory === cat.attributes.name ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{cat.attributes.name}</Text>
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
                                        <TouchableOpacity key={f.key} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: editRepeatFreq === f.key ? c.primary : c.border, backgroundColor: editRepeatFreq === f.key ? c.primary : c.bgCard }} onPress={() => setEditRepeatFreq(f.key)}>
                                            <Text style={{ color: editRepeatFreq === f.key ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Start date */}
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Prima data di inizio</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name={'calendar-today'} size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder={'YYYY-MM-DD'} placeholderTextColor={c.textMuted} value={editFirstDate} onChangeText={setEditFirstDate} />
                                </View>
                            </View>

                            {/* Notes */}
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Note</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 80, paddingTop: 12 }}>
                                    <MaterialIcons name="notes" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: 60, textAlignVertical: 'top' }} placeholder="Note aggiuntive..." placeholderTextColor={c.textMuted} value={editNotes} onChangeText={setEditNotes} multiline />
                                </View>
                            </View>

                        </View>
                    </ScrollView>

                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: c.bg + 'F2', borderTopWidth: 1, borderTopColor: c.border }}>
                        <TouchableOpacity style={[{ backgroundColor: c.primary, height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 6 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="white" /> : <><MaterialIcons name="save" size={20} color="white" /><Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Salva Modifiche</Text></>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ============ VIEW MODE ============
    const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialIcons name={icon as any} size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 2 }}>{label}</Text>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>{value || '—'}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="arrow-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Dettaglio</Text>
                <TouchableOpacity onPress={() => setEditing(true)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="edit" size={24} color={c.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View style={{ backgroundColor: c.bgCard, padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: amountColor + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <MaterialIcons name={typeIcon as any} size={32} color={amountColor} />
                    </View>
                    <Text style={{ color: amountColor, fontSize: 32, fontWeight: '800', marginBottom: 6 }}>
                        {amountPrefix}{formatCurrency(t?.amount || 0)}
                    </Text>
                    <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>
                        {a.title || 'Ricorrenza'}
                    </Text>
                    {t?.description && t.description !== a.title && (
                        <Text style={{ color: c.textSecondary, fontSize: 14 }}>
                            {t.description}
                        </Text>
                    )}

                    {!a.active && (
                        <View style={{ backgroundColor: c.warning + '22', marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: c.warning, fontSize: 12, fontWeight: '700' }}>INATTIVA</Text>
                        </View>
                    )}
                </View>

                {/* Info List */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <InfoRow icon="repeat" label="Frequenza" value={getFreqLabel(a.repeat_freq || a.repetitions?.[0]?.type || '')} />
                    <InfoRow icon="account-balance-wallet" label={isDeposit ? 'Destinazione' : 'Sorgente'} value={t?.source_name || '—'} />
                    <InfoRow icon="shopping-cart" label={isDeposit ? 'Provenienza' : isExpense ? 'Destinatario' : 'Destinazione'} value={t?.destination_name || '—'} />
                    {t?.category_name && <InfoRow icon="category" label="Categoria" value={t.category_name} />}
                    {a.created_at && <InfoRow icon="event" label="Creata in data" value={formatDate(a.created_at)} />}
                    {a.first_date && <InfoRow icon="event-available" label="Iniziata il" value={formatDate(a.first_date)} />}
                    {a.next_expected_match && <InfoRow icon="update" label="Prossima occorrenza stimata" value={formatDate(a.next_expected_match)} />}
                </View>

                {a.notes && (
                    <View style={{ marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
                        <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>NOTE</Text>
                        <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{a.notes}</Text>
                    </View>
                )}

                {/* Delete Button */}
                <TouchableOpacity onPress={handleDelete} disabled={deleting} style={{ marginHorizontal: 16, marginTop: 24, padding: 16, backgroundColor: c.danger + '1A', borderRadius: 14, borderWidth: 1, borderColor: c.danger + '33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {deleting ? <ActivityIndicator size="small" color={c.danger} /> : <><MaterialIcons name="delete-outline" size={20} color={c.danger} /><Text style={{ color: c.danger, fontSize: 15, fontWeight: '700' }}>Elimina Ricorrenza</Text></>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
