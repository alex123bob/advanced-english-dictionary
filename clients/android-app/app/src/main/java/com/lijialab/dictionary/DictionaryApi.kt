package com.lijialab.dictionary

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL

class DictionaryApi(
    private val json: Json = Json { ignoreUnknownKeys = true }
) {
    suspend fun lookup(word: String, apiBaseUrl: String): DictionaryEntry = withContext(Dispatchers.IO) {
        val base = apiBaseUrl.trimEnd('/')
        val connection = URL("$base/api/dictionary").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true

        val requestBody = json.encodeToString(DictionaryRequest(word = word, section = "basic"))
        connection.outputStream.use { stream ->
            stream.write(requestBody.toByteArray(Charsets.UTF_8))
        }

        val responseCode = connection.responseCode
        val responseText = if (responseCode in 200..299) {
            connection.inputStream.bufferedReader().use { it.readText() }
        } else {
            connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
        }

        if (responseCode !in 200..299) {
            throw IllegalStateException("Dictionary request failed ($responseCode): $responseText")
        }

        val entry = json.decodeFromString<DictionaryEntry>(responseText)
        if (entry.success == false && !entry.error.isNullOrBlank()) {
            throw IllegalStateException(entry.error)
        }
        entry
    }
}
