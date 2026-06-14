import SwiftUI

struct DictionarySearchView: View {
    @State private var query = ""
    @State private var apiBaseURL = "http://localhost:8000"
    @State private var entry: DictionaryEntry?
    @State private var recentWords: [String] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let api = DictionaryAPI()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Word Pocket")
                            .font(.system(size: 42, weight: .black, design: .rounded))
                        Text("Native iOS lookup powered by the shared dictionary API.")
                            .foregroundStyle(.secondary)
                    }

                    searchCard

                    if isLoading {
                        ProgressView("Looking up word...")
                            .frame(maxWidth: .infinity, alignment: .center)
                    } else if let errorMessage {
                        Label(errorMessage, systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.red)
                            .padding()
                            .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
                    } else if let entry {
                        resultCard(entry)
                    }

                    recentCard
                    settingsCard
                }
                .padding()
            }
            .navigationTitle("Dictionary")
        }
    }

    private var searchCard: some View {
        VStack(spacing: 12) {
            TextField("Search a word", text: $query)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)
                .onSubmit { Task { await search() } }
            Button("Look Up") {
                Task { await search() }
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 22))
    }

    private var recentCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent")
                .font(.headline)
            if recentWords.isEmpty {
                Text("No recent searches yet.")
                    .foregroundStyle(.secondary)
            } else {
                FlowLayout(items: recentWords) { word in
                    Button(word) {
                        query = word
                        Task { await search() }
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 22))
    }

    private var settingsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("API Settings")
                .font(.headline)
            TextField("API base URL", text: $apiBaseURL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 22))
    }

    private func resultCard(_ entry: DictionaryEntry) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(entry.headword)
                .font(.system(size: 38, weight: .black, design: .rounded))
            if let pronunciation = entry.primaryEntry?.pronunciation, !pronunciation.isEmpty {
                Text(pronunciation)
                    .foregroundStyle(.secondary)
            }
            ForEach(Array(entry.senses.prefix(5).enumerated()), id: \.offset) { index, sense in
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(index + 1). \(sense.definition ?? "Definition unavailable in summary.")")
                        .fontWeight(.semibold)
                    if let example = sense.example, !example.isEmpty {
                        Text(example)
                            .foregroundStyle(.secondary)
                            .italic()
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
        }
        .padding()
        .background(.blue.opacity(0.08), in: RoundedRectangle(cornerRadius: 24))
    }

    private func search() async {
        let word = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !word.isEmpty else { return }

        isLoading = true
        errorMessage = nil

        do {
            entry = try await api.lookup(word: word, apiBaseURL: apiBaseURL)
            recentWords = ([word] + recentWords.filter { $0.caseInsensitiveCompare(word) != .orderedSame }).prefix(10).map { $0 }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

struct FlowLayout<Content: View>: View {
    let items: [String]
    let content: (String) -> Content

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                content(item)
            }
        }
    }
}
