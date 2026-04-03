import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoriesApi } from '../lib/api';
import { useThemeStore } from '../store/themeStore';

export default function CategoriesScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New category
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    // Inline rename
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await categoriesApi.list();
            if (res.data?.data) setCategories(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await categoriesApi.create({ name: newName.trim() });
            if (res.data?.data) setCategories(prev => [...prev, res.data.data]);
            setNewName('');
            setShowNew(false);
        } catch (e) { Alert.alert('Errore', 'Impossibile creare la categoria'); }
        finally { setCreating(false); }
    };

    const handleRename = async (id: string) => {
        if (!editingName.trim()) return;
        setSaving(true);
        try {
            await categoriesApi.update(id, { name: editingName.trim() });
            setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, attributes: { ...cat.attributes, name: editingName.trim() } } : cat));
            setEditingId(null);
        } catch (e) { Alert.alert('Errore', 'Impossibile rinominare la categoria'); }
        finally { setSaving(false); }
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert('Elimina categoria', `Eliminare "${name}"? Le transazioni associate perderanno la categoria.`, [
            { text: 'Annulla', style: 'cancel' },
            {
                text: 'Elimina', style: 'destructive', onPress: async () => {
                    try {
                        await categoriesApi.delete(id);
                        setCategories(prev => prev.filter(cat => cat.id !== id));
                    } catch (e) { Alert.alert('Errore', 'Impossibile eliminare la categoria'); }
                }
            },
        ]);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgCard, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="arrow-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Categorie</Text>
                <TouchableOpacity onPress={() => { setShowNew(!showNew); setNewName(''); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name={showNew ? 'close' : 'add'} size={24} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* New category input */}
            {showNew && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary, height: 48 }}>
                        <MaterialIcons name="category" size={18} color={c.textSecondary} style={{ marginLeft: 12 }} />
                        <TextInput
                            style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }}
                            placeholder="Nome nuova categoria..."
                            placeholderTextColor={c.textMuted}
                            value={newName}
                            onChangeText={setNewName}
                            autoFocus
                            onSubmitEditing={handleCreate}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={creating || !newName.trim()}
                        style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !newName.trim() ? 0.5 : 1 }}
                    >
                        {creating ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="check" size={22} color="white" />}
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : categories.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <MaterialIcons name="category" size={48} color={c.textMuted} />
                    <Text style={{ color: c.textMuted, fontSize: 15 }}>Nessuna categoria</Text>
                    <TouchableOpacity onPress={() => setShowNew(true)} style={{ backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>Crea la prima</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                    {categories.map((cat, i) => {
                        const isEditing = editingId === cat.id;
                        return (
                            <View key={cat.id} style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: isEditing ? c.primary : c.border, paddingHorizontal: 16, paddingVertical: isEditing ? 12 : 0, overflow: 'hidden' }}>
                                {isEditing ? (
                                    <View style={{ gap: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.border, height: 44 }}>
                                            <MaterialIcons name="edit" size={16} color={c.textSecondary} style={{ marginLeft: 10 }} />
                                            <TextInput
                                                style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }}
                                                value={editingName}
                                                onChangeText={setEditingName}
                                                autoFocus
                                                onSubmitEditing={() => handleRename(cat.id)}
                                            />
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity onPress={() => setEditingId(null)} style={{ flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ color: c.textSecondary, fontWeight: '600', fontSize: 13 }}>Annulla</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleRename(cat.id)}
                                                disabled={saving || !editingName.trim()}
                                                style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !editingName.trim() ? 0.5 : 1 }}
                                            >
                                                {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Salva</Text>}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => { setEditingId(cat.id); setEditingName(cat.attributes.name); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}
                                    >
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                                            <MaterialIcons name="category" size={18} color={c.primary} />
                                        </View>
                                        <Text style={{ color: c.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{cat.attributes.name}</Text>
                                        <TouchableOpacity onPress={() => handleDelete(cat.id, cat.attributes.name)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                            <MaterialIcons name="delete-outline" size={20} color={c.danger} />
                                        </TouchableOpacity>
                                        <MaterialIcons name="chevron-right" size={18} color={c.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
