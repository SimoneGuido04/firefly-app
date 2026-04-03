import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountsApi, categoriesApi, transactionsApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/helpers';
import { useRefreshStore } from '../../store/refreshStore';
import { useThemeStore } from '../../store/themeStore';

export default function TransactionDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: c } = useThemeStore();
    const triggerRefresh = useRefreshStore(s => s.triggerRefresh);

    const [tx, setTx] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Edit state
    const [editType, setEditType] = useState<'withdrawal' | 'deposit' | 'transfer'>('withdrawal');
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editSourceId, setEditSourceId] = useState('');
    const [editSourceName, setEditSourceName] = useState('');
    const [editDestName, setEditDestName] = useState('');
    const [editDestId, setEditDestId] = useState('');

    // Lists for pickers
    const [accounts, setAccounts] = useState<any[]>([]);
    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
    const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [showNewDest, setShowNewDest] = useState(false);
    const [newDestInputName, setNewDestInputName] = useState('');
    const [creatingDest, setCreatingDest] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            const [txRes, accRes, expRes, revRes, catRes] = await Promise.all([
                transactionsApi.get(id),
                accountsApi.list('asset'),
                accountsApi.list('expense'),
                accountsApi.list('revenue'),
                categoriesApi.list(),
            ]);
            if (accRes.data?.data) setAccounts(accRes.data.data);
            if (expRes.data?.data) setExpenseAccounts(expRes.data.data);
            if (revRes.data?.data) setRevenueAccounts(revRes.data.data);
            if (catRes.data?.data) setCategories(catRes.data.data);
            if (txRes.data?.data) {
                const data = txRes.data.data;
                setTx(data);
                const t = data.attributes.transactions[0];
                setEditType(t.type || 'withdrawal');
                setEditDesc(t.description || '');
                setEditAmount(t.amount ? parseFloat(t.amount).toString() : '');
                setEditDate(t.date?.split('T')[0] || '');
                setEditCategory(t.category_name || '');
                setEditNotes(t.notes || '');
                setEditTags(t.tags?.map((tg: any) => typeof tg === 'string' ? tg : tg.tag).join(', ') || '');
                setEditSourceId(t.source_id?.toString() || '');
                setEditSourceName(t.source_name || '');
                setEditDestName(t.destination_name || '');
                setEditDestId(t.destination_id?.toString() || '');
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!tx) return;
        if (!editAmount || parseFloat(editAmount) <= 0) { Alert.alert('Errore', 'Importo non valido'); return; }
        if (!editDesc.trim()) { Alert.alert('Errore', 'Descrizione richiesta'); return; }
        setSaving(true);
        try {
            const txData: any = {
                type: editType,
                description: editDesc,
                amount: editAmount.replace(',', '.'),
                date: editDate,
                tags: editTags ? editTags.split(',').map(t => t.trim()) : [],
                notes: editNotes || undefined,
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
                txData.destination_id = editDestId || undefined;
                txData.destination_name = editDestId ? undefined : (editDestName || 'Unknown');
            }
            await transactionsApi.update(tx.id, { transactions: [txData] });
            triggerRefresh();
            Alert.alert('Successo', 'Transazione aggiornata!');
            setEditing(false);
            setLoading(true);
            await load();
        } catch (e: any) {
            console.error(e?.response?.data || e);
            Alert.alert('Errore', e?.response?.data?.message || 'Impossibile aggiornare');
        } finally { setSaving(false); }
    };

    const handleDelete = () => {
        Alert.alert('Elimina transazione', 'Sei sicuro? Questa azione non può essere annullata.', [
            { text: 'Annulla', style: 'cancel' },
            {
                text: 'Elimina', style: 'destructive', onPress: async () => {
                    setDeleting(true);
                    try {
                        await transactionsApi.delete(tx.id);
                        triggerRefresh();
                        Alert.alert('Eliminata', 'Transazione eliminata.', [{ text: 'OK', onPress: () => router.back() }]);
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

    if (!tx) return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="error-outline" size={48} color={c.danger} />
            <Text style={{ color: c.text, fontSize: 16, marginTop: 12 }}>Transazione non trovata</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={{ color: c.primary, fontSize: 14, fontWeight: '700' }}>Torna indietro</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );

    const t = tx.attributes.transactions[0];
    const type = t.type;
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

    // ============ EDIT MODE ============
    if (editing) {
        const editAmountColor = editType === 'withdrawal' ? c.danger : editType === 'deposit' ? c.success : c.primary;
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                        <TouchableOpacity onPress={() => setEditing(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialIcons name="close" size={24} color={c.text} />
                        </TouchableOpacity>
                        <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Modifica Transazione</Text>
                        <TouchableOpacity onPress={handleSave} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color={c.primary} /> : <MaterialIcons name="check" size={24} color={c.primary} />}
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                        {/* Amount Hero */}
                        <View style={{ backgroundColor: c.primaryBg, paddingVertical: 32, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: 4 }}>Importo</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={{ color: editAmountColor, fontSize: 24, fontWeight: '800', marginRight: 4 }}>€</Text>
                                <TextInput style={{ color: editAmountColor, fontSize: 48, fontWeight: '800', minWidth: 100, textAlign: 'center' }}
                                    value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={c.textMuted} />
                            </View>
                        </View>

                        {/* Type Selector */}
                        <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
                            {TYPES.map(tp => (
                                <TouchableOpacity key={tp.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: editType === tp.key ? tp.color : c.border, backgroundColor: editType === tp.key ? tp.color + '22' : c.bgCard }} onPress={() => setEditType(tp.key)}>
                                    <MaterialIcons name={tp.icon as any} size={18} color={editType === tp.key ? tp.color : c.textMuted} />
                                    <Text style={{ color: editType === tp.key ? tp.color : c.textMuted, fontSize: 12, fontWeight: '700' }}>{tp.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}>
                            {/* Description */}
                            <View style={{ gap: 8 }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Descrizione</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="edit" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Descrizione" placeholderTextColor={c.textMuted} value={editDesc} onChangeText={setEditDesc} />
                                </View>
                            </View>

                            {/* Account Selector */}
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

                            {/* Destination */}
                            <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{editType === 'deposit' ? 'Provenienza' : editType === 'transfer' ? 'Conto destinazione' : 'Destinazione spesa'}</Text>
                                    {editType !== 'transfer' && (
                                        <TouchableOpacity onPress={() => { setShowNewDest(!showNewDest); setNewDestInputName(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <MaterialIcons name={showNewDest ? 'close' : 'add'} size={16} color={c.primary} />
                                            <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{showNewDest ? 'Annulla' : 'Nuovo'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {editType !== 'transfer' && showNewDest && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary, height: 44 }}>
                                            <MaterialIcons name="store" size={16} color={c.textSecondary} style={{ marginLeft: 12 }} />
                                            <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }} placeholder="Nome conto..." placeholderTextColor={c.textMuted} value={newDestInputName} onChangeText={setNewDestInputName} autoFocus />
                                        </View>
                                        <TouchableOpacity
                                            disabled={creatingDest || !newDestInputName.trim()}
                                            onPress={async () => {
                                                if (!newDestInputName.trim()) return;
                                                setCreatingDest(true);
                                                try {
                                                    const accType = editType === 'deposit' ? 'revenue' : 'expense';
                                                    const res = await accountsApi.create({ name: newDestInputName.trim(), type: accType });
                                                    const created = res.data?.data;
                                                    if (created) {
                                                        if (editType === 'deposit') setRevenueAccounts(prev => [...prev, created]);
                                                        else setExpenseAccounts(prev => [...prev, created]);
                                                        setEditDestName(created.attributes.name);
                                                    }
                                                    setShowNewDest(false); setNewDestInputName('');
                                                } catch (e) { Alert.alert('Errore', 'Impossibile creare il conto'); }
                                                finally { setCreatingDest(false); }
                                            }}
                                            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !newDestInputName.trim() ? 0.5 : 1 }}
                                        >
                                            {creatingDest ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="check" size={20} color="white" />}
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    {(editType === 'transfer' ? accounts : editType === 'deposit' ? revenueAccounts : expenseAccounts).map(acc => {
                                        const selected = editType === 'transfer' ? editDestId === acc.id.toString() : editDestName === acc.attributes.name;
                                        return (
                                            <TouchableOpacity key={acc.id}
                                                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : c.bgCard }}
                                                onPress={() => { if (editType === 'transfer') { setEditDestId(acc.id.toString()); setEditDestName(acc.attributes.name); } else setEditDestName(acc.attributes.name); }}
                                            >
                                                <Text style={{ color: selected ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{acc.attributes.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Category */}
                            {editType !== 'transfer' && (
                                <View style={{ gap: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Categoria</Text>
                                        <TouchableOpacity onPress={() => { setShowNewCategory(!showNewCategory); setNewCategoryName(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <MaterialIcons name={showNewCategory ? 'close' : 'add'} size={16} color={c.primary} />
                                            <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{showNewCategory ? 'Annulla' : 'Nuova'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {showNewCategory && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary, height: 44 }}>
                                                <MaterialIcons name="category" size={16} color={c.textSecondary} style={{ marginLeft: 12 }} />
                                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }} placeholder="Nome categoria..." placeholderTextColor={c.textMuted} value={newCategoryName} onChangeText={setNewCategoryName} autoFocus />
                                            </View>
                                            <TouchableOpacity
                                                disabled={creatingCategory || !newCategoryName.trim()}
                                                onPress={async () => {
                                                    if (!newCategoryName.trim()) return;
                                                    setCreatingCategory(true);
                                                    try {
                                                        const res = await categoriesApi.create({ name: newCategoryName.trim() });
                                                        const created = res.data?.data;
                                                        if (created) { setCategories(prev => [...prev, created]); setEditCategory(created.attributes.name); }
                                                        setShowNewCategory(false); setNewCategoryName('');
                                                    } catch (e) { Alert.alert('Errore', 'Impossibile creare la categoria'); }
                                                    finally { setCreatingCategory(false); }
                                                }}
                                                style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !newCategoryName.trim() ? 0.5 : 1 }}
                                            >
                                                {creatingCategory ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="check" size={20} color="white" />}
                                            </TouchableOpacity>
                                        </View>
                                    )}
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

                            {/* Date & Tags */}
                            {[
                                { label: 'Data', icon: 'calendar-today', value: editDate, set: setEditDate, placeholder: 'YYYY-MM-DD' },
                                { label: 'Tag', icon: 'sell', value: editTags, set: setEditTags, placeholder: 'Separati da virgola' },
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
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: 60, textAlignVertical: 'top' }} placeholder="Note aggiuntive..." placeholderTextColor={c.textMuted} value={editNotes} onChangeText={setEditNotes} multiline />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Save Button */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="arrow-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Dettaglio</Text>
                <TouchableOpacity onPress={() => setEditing(true)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="edit" size={22} color={c.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Amount Hero */}
                <View style={{ alignItems: 'center', paddingVertical: 32, backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: amountColor + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <MaterialIcons name={typeIcon as any} size={32} color={amountColor} />
                    </View>
                    <Text style={{ color: amountColor, fontSize: 36, fontWeight: '800' }}>
                        {amountPrefix} {formatCurrency(t.amount, t.currency_symbol || '€')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <View style={{ backgroundColor: amountColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: amountColor, fontSize: 12, fontWeight: '700' }}>{typeLabel}</Text>
                        </View>
                    </View>
                </View>

                {/* Details */}
                <View style={{ backgroundColor: c.bgCard, marginTop: 12, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16 }}>
                    <InfoRow icon="edit" label="Descrizione" value={t.description} />
                    <InfoRow icon="calendar-today" label="Data" value={formatDate(t.date)} />
                    <InfoRow icon="account-balance" label="Conto di origine" value={t.source_name} />
                    <InfoRow icon="store" label="Destinazione" value={t.destination_name} />
                    <InfoRow icon="category" label="Categoria" value={t.category_name || '—'} />
                    <InfoRow icon="sell" label="Tag" value={t.tags?.map((tg: any) => typeof tg === 'string' ? tg : tg.tag).join(', ') || '—'} />
                    <InfoRow icon="attach-money" label="Valuta" value={`${t.currency_name || ''} (${t.currency_code || ''})`} />
                    {t.foreign_amount && (
                        <InfoRow icon="currency-exchange" label="Importo estero" value={`${t.foreign_currency_symbol || ''} ${t.foreign_amount}`} />
                    )}
                    <InfoRow icon="fingerprint" label="ID Transazione" value={`#${tx.id}`} />
                </View>

                {/* Notes */}
                <View style={{ backgroundColor: c.bgCard, marginTop: 12, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <MaterialIcons name="notes" size={18} color={c.primary} />
                        <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600' }}>NOTE</Text>
                    </View>
                    <Text style={{ color: t.notes ? c.text : c.textMuted, fontSize: 14, lineHeight: 20, fontStyle: t.notes ? 'normal' : 'italic' }}>
                        {t.notes || 'Nessuna nota'}
                    </Text>
                </View>

                {/* Metadata */}
                <View style={{ backgroundColor: c.bgCard, marginTop: 12, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                    <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 10 }}>INFORMAZIONI</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 12 }}>Creata</Text>
                        <Text style={{ color: c.text, fontSize: 12, fontWeight: '500' }}>{tx.attributes.created_at ? formatDate(tx.attributes.created_at) : '—'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: c.textSecondary, fontSize: 12 }}>Aggiornata</Text>
                        <Text style={{ color: c.text, fontSize: 12, fontWeight: '500' }}>{tx.attributes.updated_at ? formatDate(tx.attributes.updated_at) : '—'}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.bg + 'F2', borderTopWidth: 1, borderTopColor: c.border, padding: 16, paddingBottom: 32, flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }} onPress={() => setEditing(true)}>
                    <MaterialIcons name="edit" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Modifica</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ height: 50, width: 50, borderRadius: 14, backgroundColor: c.danger + '14', borderWidth: 1, borderColor: c.danger + '33', alignItems: 'center', justifyContent: 'center' }} onPress={handleDelete} disabled={deleting}>
                    {deleting ? <ActivityIndicator size="small" color={c.danger} /> : <MaterialIcons name="delete" size={22} color={c.danger} />}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
