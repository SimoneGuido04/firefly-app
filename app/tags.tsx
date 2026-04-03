import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tagsApi } from '../lib/api';
import { useThemeStore } from '../store/themeStore';

export default function TagsScreen() {
    const router = useRouter();
    const { colors: c } = useThemeStore();

    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New tag
    const [showNew, setShowNew] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Inline rename
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDesc, setEditingDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await tagsApi.list();
            if (res.data?.data) setTags(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!newTag.trim()) return;
        setCreating(true);
        try {
            const res = await tagsApi.create({ tag: newTag.trim(), description: newDesc.trim() || undefined });
            if (res.data?.data) setTags(prev => [...prev, res.data.data]);
            setNewTag(''); setNewDesc(''); setShowNew(false);
        } catch (e) { Alert.alert('Errore', 'Impossibile creare il tag'); }
        finally { setCreating(false); }
    };

    const handleRename = async (originalTag: string) => {
        if (!editingName.trim()) return;
        setSaving(true);
        try {
            await tagsApi.update(originalTag, { tag: editingName.trim(), description: editingDesc.trim() || undefined });
            setTags(prev => prev.map(t =>
                t.attributes.tag === originalTag
                    ? { ...t, attributes: { ...t.attributes, tag: editingName.trim(), description: editingDesc.trim() } }
                    : t
            ));
            setEditingTag(null);
        } catch (e) { Alert.alert('Errore', 'Impossibile modificare il tag'); }
        finally { setSaving(false); }
    };

    const handleDelete = (tag: string) => {
        Alert.alert('Elimina tag', `Eliminare "#${tag}"?`, [
            { text: 'Annulla', style: 'cancel' },
            {
                text: 'Elimina', style: 'destructive', onPress: async () => {
                    try {
                        await tagsApi.delete(tag);
                        setTags(prev => prev.filter(t => t.attributes.tag !== tag));
                    } catch (e) { Alert.alert('Errore', 'Impossibile eliminare il tag'); }
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
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Tag</Text>
                <TouchableOpacity onPress={() => { setShowNew(!showNew); setNewTag(''); setNewDesc(''); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name={showNew ? 'close' : 'add'} size={24} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* New tag form */}
            {showNew && (
                <View style={{ gap: 8, padding: 16, backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary, height: 48 }}>
                            <MaterialIcons name="sell" size={18} color={c.textSecondary} style={{ marginLeft: 12 }} />
                            <TextInput
                                style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 10, height: '100%' }}
                                placeholder="Nome tag..."
                                placeholderTextColor={c.textMuted}
                                value={newTag}
                                onChangeText={setNewTag}
                                autoFocus
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={creating || !newTag.trim()}
                            style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !newTag.trim() ? 0.5 : 1 }}
                        >
                            {creating ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="check" size={22} color="white" />}
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 44 }}>
                        <MaterialIcons name="notes" size={16} color={c.textSecondary} style={{ marginLeft: 12 }} />
                        <TextInput
                            style={{ flex: 1, color: c.text, fontSize: 13, paddingHorizontal: 10, height: '100%' }}
                            placeholder="Descrizione (opzionale)..."
                            placeholderTextColor={c.textMuted}
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />
                    </View>
                </View>
            )}

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : tags.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <MaterialIcons name="sell" size={48} color={c.textMuted} />
                    <Text style={{ color: c.textMuted, fontSize: 15 }}>Nessun tag</Text>
                    <TouchableOpacity onPress={() => setShowNew(true)} style={{ backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>Crea il primo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                    {tags.map(t => {
                        const tagName: string = t.attributes.tag;
                        const tagDesc: string = t.attributes.description || '';
                        const isEditing = editingTag === tagName;
                        return (
                            <View key={t.id} style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: isEditing ? c.primary : c.border, paddingHorizontal: 16, paddingVertical: isEditing ? 12 : 0, overflow: 'hidden' }}>
                                {isEditing ? (
                                    <View style={{ gap: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.border, height: 44 }}>
                                            <MaterialIcons name="sell" size={16} color={c.textSecondary} style={{ marginLeft: 10 }} />
                                            <TextInput
                                                style={{ flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 8, height: '100%' }}
                                                value={editingName}
                                                onChangeText={setEditingName}
                                                autoFocus
                                            />
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, borderWidth: 1, borderColor: c.border, height: 44 }}>
                                            <MaterialIcons name="notes" size={16} color={c.textSecondary} style={{ marginLeft: 10 }} />
                                            <TextInput
                                                style={{ flex: 1, color: c.text, fontSize: 13, paddingHorizontal: 8, height: '100%' }}
                                                placeholder="Descrizione (opzionale)..."
                                                placeholderTextColor={c.textMuted}
                                                value={editingDesc}
                                                onChangeText={setEditingDesc}
                                            />
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity onPress={() => setEditingTag(null)} style={{ flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ color: c.textSecondary, fontWeight: '600', fontSize: 13 }}>Annulla</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleRename(tagName)}
                                                disabled={saving || !editingName.trim()}
                                                style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: !editingName.trim() ? 0.5 : 1 }}
                                            >
                                                {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Salva</Text>}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => { setEditingTag(tagName); setEditingName(tagName); setEditingDesc(tagDesc); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}
                                    >
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                                            <MaterialIcons name="sell" size={18} color={c.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>#{tagName}</Text>
                                            {tagDesc ? <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{tagDesc}</Text> : null}
                                        </View>
                                        <TouchableOpacity onPress={() => handleDelete(tagName)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
