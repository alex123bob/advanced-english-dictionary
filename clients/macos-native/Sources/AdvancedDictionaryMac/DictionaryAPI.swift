import Foundation

struct DictionaryAPI {
    func lookup(word: String, apiBaseURL: String) async throws -> DictionaryEntry {
        let base = apiBaseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(base)/api/dictionary") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(DictionaryRequest(word: word, section: "basic"))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder.dictionaryDecoder.decode(DictionaryEntry.self, from: data)
        if decoded.success == false, let error = decoded.error {
            throw DictionaryAPIError.server(error)
        }
        return decoded
    }
}

struct DictionaryRequest: Encodable {
    let word: String
    let section: String
}

enum DictionaryAPIError: LocalizedError {
    case server(String)

    var errorDescription: String? {
        switch self {
        case .server(let message): return message
        }
    }
}

struct DictionaryEntry: Decodable {
    let success: Bool?
    let error: String?
    let headword: String
    let entries: [DictionaryEntryVariant]?

    var primaryEntry: DictionaryEntryVariant? { entries?.first }

    var senses: [DictionarySense] {
        entries?.first?.meaningsSummary.flatMap { meaning in
            meaning.senses.map { sense in
                DictionarySense(definition: sense.definition, example: sense.example, partOfSpeech: meaning.partOfSpeech)
            }
        } ?? []
    }
}

struct DictionaryEntryVariant: Decodable {
    let pronunciation: String?
    let meaningsSummary: [DictionaryMeaning]
}

struct DictionaryMeaning: Decodable {
    let partOfSpeech: String?
    let senses: [DictionarySense]
}

struct DictionarySense: Decodable {
    let definition: String?
    let example: String?
    let partOfSpeech: String?
}

extension JSONDecoder {
    static var dictionaryDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}
