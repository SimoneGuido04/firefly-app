import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountsApi, categoriesApi, recurringApi, tagsApi } from '../lib/api';
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
    const [firstTime, setFirstTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('00:00');
    const [nrOfRepetitions, setNrOfRepetitions] = useState('0');
    const [repeatFreq, setRepeatFreq] = useState('monthly');
    const [sourceId, setSourceId] = useState('');
    const [destName, setDestName] = useState('');
    const [destId, setDestId] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Account lists
    const [accounts, setAccounts] = useState<any[]>([]);
    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
    const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);

    // Category
    const [categories, setCategories] = useState<any[]>([]);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    // Destination create
    const [showNewDest, setShowNewDest] = useState(false);
    const [newDestInputName, setNewDestInputName] = useState('');
    const [creatingDest, setCreatingDest] = useState(false);

    // Tags
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [showNewTag, setShowNewTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [creatingTag, setCreatingTag] = useState(false);

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [accRes, expRes, revRes, catRes, tagRes] = await Promise.all([
                    accountsApi.list('asset'),
                    accountsApi.list('expense'),
                    accountsApi.list('revenue'),
                    categoriesApi.list(),
                    tagsApi.list(),
                ]);
                if (accRes.data?.data) { setAccounts(accRes.data.data); if (accRes.data.data.length > 0) setSourceId(accRes.data.data[0].id); }
                if (expRes.data?.data) setExpenseAccounts(expRes.data.data);
                if (revRes.data?.data) setRevenueAccounts(revRes.data.data);
                if (catRes.data?.data) setCategories(catRes.data.data);
                if (tagRes.data?.data) setAvailableTags(tagRes.data.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const getMoment = (freq: string, dateStr: string): string => {
        const d = new Date(dateStr);
        if (freq === 'weekly') return String(d.getDay() === 0 ? 7 : d.getDay());
        if (freq === 'monthly') return String(d.getDate());
        if (freq === 'quarterly' || freq === 'half-year') return `1/${d.getDate()}`;
        if (freq === 'yearly') return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return '1';
    };

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
            if (selectedTags.length > 0) txData.tags = selectedTags;
            if (type === 'withdrawal') {
                txData.destination_name = destName || 'Unknown';
                if (categoryName) txData.category_name = categoryName;
            } else if (type === 'deposit') {
                txData.source_name = destName || 'Unknown';
                txData.source_id = undefined;
                txData.destination_id = sourceId;
                if (categoryName) txData.category_name = categoryName;
            } else {
                txData.destination_id = destId || undefined;
                txData.destination_name = destId ? undefined : (destName || 'Unknown');
            }

            const payload: any = {
                type,
                title: title.trim(),
                first_date: `${firstDate}T${firstTime}:00+00:00`,
                repeat_freq: repeatFreq,
                notes: notes || undefined,
                active: true,
                apply_rules: true,
                transactions: [txData],
                repetitions: [{ type: repeatFreq, moment: getMoment(repeatFreq, firstDate) }],
            };
            if (endDate) {
                payload.repeat_until = `${endDate}T${endTime}:00+00:00`;
            } else {
                const nr = parseInt(nrOfRepetitions) || 0;
                payload.nr_of_repetitions = nr > 0 ? nr : null;
            }
            await recurringApi.create(payload);
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
                                <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="Descrizione (opzionale)" placeholderTextColor={c.textMuted} value={description} onChangeText={setDescription} />
                            </View>
                        </View>

                        {/* Source account */}
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>{type === 'deposit' ? 'Provenienza' : type === 'transfer' ? 'Conto destinazione' : 'Destinazione spesa'}</Text>
                                {type !== 'transfer' && (
                                    <TouchableOpacity onPress={() => { setShowNewDest(!showNewDest); setNewDestInputName(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialIcons name={showNewDest ? 'close' : 'add'} size={16} color={c.primary} />
                                        <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{showNewDest ? 'Annulla' : 'Nuovo'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {type !== 'transfer' && showNewDest && (
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
                                                const accType = type === 'deposit' ? 'revenue' : 'expense';
                                                const res = await accountsApi.create({ name: newDestInputName.trim(), type: accType });
                                                const created = res.data?.data;
                                                if (created) {
                                                    if (type === 'deposit') setRevenueAccounts(prev => [...prev, created]);
                                                    else setExpenseAccounts(prev => [...prev, created]);
                                                    setDestName(created.attributes.name);
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
                                {(type === 'transfer' ? accounts : type === 'deposit' ? revenueAccounts : expenseAccounts).map(acc => {
                                    const selected = type === 'transfer' ? destId === acc.id : destName === acc.attributes.name;
                                    return (
                                        <TouchableOpacity key={acc.id}
                                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : c.bgCard }}
                                            onPress={() => { if (type === 'transfer') { setDestId(acc.id); setDestName(acc.attributes.name); } else setDestName(acc.attributes.name); }}
                                        >
                                            <Text style={{ color: selected ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{acc.attributes.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Category */}
                        {type !== 'transfer' && (
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
                                                    if (created) { setCategories(prev => [...prev, created]); setCategoryName(created.attributes.name); }
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

                        {/* First occurrence */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Prima occorrenza</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="event" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} value={firstDate} onChangeText={setFirstDate} />
                                </View>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="access-time" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }} placeholder="HH:MM" placeholderTextColor={c.textMuted} value={firstTime} onChangeText={setFirstTime} keyboardType="numbers-and-punctuation" />
                                </View>
                            </View>
                        </View>

                        {/* End date */}
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Data fine (opzionale)</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                    <MaterialIcons name="event-busy" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} value={endDate} onChangeText={setEndDate} />
                                </View>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: endDate ? c.border : c.border, height: 52, opacity: endDate ? 1 : 0.4 }}>
                                    <MaterialIcons name="access-time" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                    <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }} placeholder="HH:MM" placeholderTextColor={c.textMuted} value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" editable={!!endDate} />
                                </View>
                            </View>
                        </View>

                        {/* Nr of repetitions — solo se no data fine */}
                        {!endDate && (
                            <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Numero di ripetizioni</Text>
                                    <Text style={{ color: c.textMuted, fontSize: 11 }}>0 = infinito</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 52 }}>
                                        <MaterialIcons name="repeat" size={18} color={c.textSecondary} style={{ marginLeft: 14 }} />
                                        <TextInput
                                            style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }}
                                            placeholder="0"
                                            placeholderTextColor={c.textMuted}
                                            value={nrOfRepetitions}
                                            onChangeText={v => setNrOfRepetitions(v.replace(/[^0-9]/g, ''))}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                                        {['0','6','12','24','52'].map(n => (
                                            <TouchableOpacity key={n}
                                                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: nrOfRepetitions === n ? c.primary : c.border, backgroundColor: nrOfRepetitions === n ? c.primary : c.bgCard }}
                                                onPress={() => setNrOfRepetitions(n)}
                                            >
                                                <Text style={{ color: nrOfRepetitions === n ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>{n === '0' ? '∞' : n}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        )}

                        {/* Tags */}
                        <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Tag</Text>
                                <TouchableOpacity onPress={() => { setShowNewTag(!showNewTag); setNewTagName(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialIcons name={showNewTag ? 'close' : 'add'} size={16} color={c.primary} />
                                    <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{showNewTag ? 'Annulla' : 'Nuovo'}</Text>
                                </TouchableOpacity>
                            </View>
                            {showNewTag && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary, height: 44 }}>
                                        <MaterialIcons name="sell" size={16} color={c.textSecondary} style={{ marginLeft: 12 }} />
                                        <TextInput style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }} placeholder="Nome tag..." placeholderTextColor={c.textMuted} value={newTagName} onChangeText={setNewTagName} autoFocus />
                                    </View>
                                    <TouchableOpacity
                                        disabled={creatingTag || !newTagName.trim()}
                                        onPress={async () => {
                                            if (!newTagName.trim()) return;
                                            setCreatingTag(true);
                                            try {
                                                const res = await tagsApi.create({ tag: newTagName.trim() });
                                                const created = res.data?.data;
                                                if (created) {
                                                    setAvailableTags(prev => [...prev, created]);
                                                    setSelectedTags(prev => [...prev, created.attributes.tag]);
                                                }
                                                setShowNewTag(false); setNewTagName('');
                                            } catch (e) { Alert.alert('Errore', 'Impossibile creare il tag'); }
                                            finally { setCreatingTag(false); }
                                        }}
                                        style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !newTagName.trim() ? 0.5 : 1 }}
                                    >
                                        {creatingTag ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="check" size={20} color="white" />}
                                    </TouchableOpacity>
                                </View>
                            )}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {availableTags.map(tag => {
                                    const tagName: string = tag.attributes.tag;
                                    const selected = selectedTags.includes(tagName);
                                    return (
                                        <TouchableOpacity key={tag.id}
                                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : c.bgCard }}
                                            onPress={() => setSelectedTags(prev => selected ? prev.filter(t => t !== tagName) : [...prev, tagName])}
                                        >
                                            <Text style={{ color: selected ? 'white' : c.textSecondary, fontSize: 13, fontWeight: '600' }}>#{tagName}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

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
