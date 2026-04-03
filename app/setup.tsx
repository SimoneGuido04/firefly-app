import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

export default function SetupScreen() {
    const { setCredentials } = useAuthStore();
    const { colors: c } = useThemeStore();
    const router = useRouter();
    const [url, setUrl] = useState('https://');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [showToken, setShowToken] = useState(false);

    const handleConnect = async () => {
        if (!url || !token || url === 'https://') { Alert.alert('Errore', 'Inserisci sia URL che Token.'); return; }
        setLoading(true);
        try {
            const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            await axios.get(`${formattedUrl}/api/v1/about`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            await setCredentials(formattedUrl, token);
            router.replace('/(tabs)');
        } catch (e) {
            console.error(e);
            Alert.alert('Errore di connessione', 'URL o Token non validi.');
        } finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: c.bg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                    <Text style={{ flex: 1, color: c.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Configurazione Istanza</Text>
                </View>

                <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 16, paddingHorizontal: 24 }}>
                    <View style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 8 }}>
                        <MaterialIcons name="account-balance-wallet" size={48} color="white" />
                    </View>
                    <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>Connetti il tuo account</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>
                        Configura il tuo server Firefly III per iniziare a gestire le tue finanze in mobilità.
                    </Text>
                </View>

                <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 20 }}>
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>URL dell'istanza</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 56 }}>
                            <MaterialIcons name="link" size={20} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 15, paddingHorizontal: 12, height: '100%' }} placeholder="https://firefly.example.com" placeholderTextColor={c.textMuted} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            const base = url.endsWith('/') ? url.slice(0, -1) : url;
                            if (!base || base === 'https:/') { Alert.alert('Errore', 'Inserisci prima l\'URL dell\'istanza.'); return; }
                            Linking.openURL(`${base}/profile`);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primaryBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary + '55', height: 44 }}
                    >
                        <MaterialIcons name="open-in-browser" size={18} color={c.primary} />
                        <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>Apri profilo per ottenere il token OAuth</Text>
                    </TouchableOpacity>

                    <View style={{ gap: 8 }}>
                        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>Personal Access Token</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, height: 56 }}>
                            <MaterialIcons name="vpn-key" size={20} color={c.textSecondary} style={{ marginLeft: 14 }} />
                            <TextInput style={{ flex: 1, color: c.text, fontSize: 15, paddingHorizontal: 12, height: '100%' }} placeholder="Inserisci il tuo token" placeholderTextColor={c.textMuted} value={token} onChangeText={setToken} secureTextEntry={!showToken} autoCapitalize="none" />
                            <TouchableOpacity onPress={() => setShowToken(!showToken)} style={{ paddingHorizontal: 14 }}>
                                <MaterialIcons name={showToken ? 'visibility-off' : 'visibility'} size={20} color={c.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', backgroundColor: c.primaryBg, borderRadius: 12, borderWidth: 1, borderColor: c.primary + '33', padding: 14, alignItems: 'flex-start' }}>
                        <MaterialIcons name="info" size={20} color={c.primary} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ color: c.text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>Come trovare il token</Text>
                            <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18 }}>
                                Vai su Options {'>'} OAuth {'>'} Personal Access Tokens nella tua istanza web per creare un nuovo token.
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 24, paddingTop: 32, gap: 12 }}>
                    <TouchableOpacity style={[{ backgroundColor: c.primary, height: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 6 }, loading && { opacity: 0.7 }]} onPress={handleConnect} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <><MaterialIcons name="login" size={20} color="white" /><Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Connetti Account</Text></>}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 12 }}>
                        <Text style={{ color: c.textSecondary, fontSize: 14, fontWeight: '500' }}>Hai bisogno di aiuto?</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Text style={{ color: c.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700' }}>POWERED BY FIREFLY III</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
