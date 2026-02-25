package com.digitaledu.mobile.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.digitaledu.core.data.auth.AuthSessionStore
import com.digitaledu.core.model.auth.AuthTokens
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import org.json.JSONObject

class SecureAuthSessionStore(
    context: Context,
) : AuthSessionStore {
    private val appContext = context.applicationContext
    private val sharedPreferences = appContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    private val state = MutableStateFlow(readFromStorage())

    override fun current(): AuthTokens? = state.value

    override fun observe(): Flow<AuthTokens?> = state

    override fun update(tokens: AuthTokens) {
        val payload = JSONObject()
            .put(JSON_ACCESS_TOKEN, tokens.accessToken)
            .put(JSON_REFRESH_TOKEN, tokens.refreshToken)
            .toString()
        val encrypted = encrypt(payload)
        sharedPreferences.edit().putString(TOKENS_KEY, encrypted).apply()
        state.value = tokens
    }

    override fun clear() {
        clearStorage()
        state.value = null
    }

    private fun readFromStorage(): AuthTokens? {
        val encryptedPayload = sharedPreferences.getString(TOKENS_KEY, null) ?: return null
        val decryptedPayload = runCatching { decrypt(encryptedPayload) }
            .getOrElse {
                clearStorage()
                return null
            }
        return runCatching {
            val json = JSONObject(decryptedPayload)
            AuthTokens(
                accessToken = json.getString(JSON_ACCESS_TOKEN),
                refreshToken = json.getString(JSON_REFRESH_TOKEN),
            )
        }.getOrElse {
            clearStorage()
            null
        }
    }

    private fun clearStorage() {
        sharedPreferences.edit().remove(TOKENS_KEY).apply()
    }

    private fun encrypt(plaintext: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        val iv = cipher.iv
        val encryptedBytes = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
        val payload = ByteArray(1 + iv.size + encryptedBytes.size)
        payload[0] = iv.size.toByte()
        System.arraycopy(iv, 0, payload, 1, iv.size)
        System.arraycopy(encryptedBytes, 0, payload, 1 + iv.size, encryptedBytes.size)
        return Base64.encodeToString(payload, Base64.NO_WRAP)
    }

    private fun decrypt(payload: String): String {
        val bytes = Base64.decode(payload, Base64.NO_WRAP)
        require(bytes.size > 1) { "Encrypted payload is invalid." }
        val ivSize = bytes[0].toInt() and 0xFF
        require(ivSize > 0 && bytes.size > 1 + ivSize) { "Encrypted payload is invalid." }
        val iv = bytes.copyOfRange(1, 1 + ivSize)
        val encryptedBytes = bytes.copyOfRange(1 + ivSize, bytes.size)

        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateSecretKey(),
            GCMParameterSpec(GCM_TAG_SIZE_BITS, iv),
        )
        return cipher.doFinal(encryptedBytes).toString(StandardCharsets.UTF_8)
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val existingKey = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
        if (existingKey != null) {
            return existingKey
        }

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val parameterSpec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build()
        keyGenerator.init(parameterSpec)
        return keyGenerator.generateKey()
    }

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "digitaledu.auth.tokens"
        const val PREFERENCES_NAME = "digitaledu_secure_storage"
        const val TOKENS_KEY = "auth_tokens"
        const val JSON_ACCESS_TOKEN = "access_token"
        const val JSON_REFRESH_TOKEN = "refresh_token"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val GCM_TAG_SIZE_BITS = 128
    }
}
