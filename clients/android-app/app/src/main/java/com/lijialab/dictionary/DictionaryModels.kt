package com.lijialab.dictionary

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DictionaryRequest(
    val word: String,
    val section: String
)

@Serializable
data class DictionaryEntry(
    val success: Boolean? = null,
    val error: String? = null,
    val headword: String,
    val entries: List<DictionaryEntryVariant> = emptyList()
) {
    val primaryEntry: DictionaryEntryVariant?
        get() = entries.firstOrNull()

    val senses: List<DictionarySense>
        get() = primaryEntry?.meaningsSummary.orEmpty().flatMap { meaning ->
            meaning.senses.map { sense -> sense.copy(partOfSpeech = meaning.partOfSpeech) }
        }
}

@Serializable
data class DictionaryEntryVariant(
    val pronunciation: String? = null,
    @SerialName("meanings_summary")
    val meaningsSummary: List<DictionaryMeaning> = emptyList()
)

@Serializable
data class DictionaryMeaning(
    @SerialName("part_of_speech")
    val partOfSpeech: String? = null,
    val senses: List<DictionarySense> = emptyList()
)

@Serializable
data class DictionarySense(
    val definition: String? = null,
    val example: String? = null,
    @SerialName("part_of_speech")
    val partOfSpeech: String? = null
)
