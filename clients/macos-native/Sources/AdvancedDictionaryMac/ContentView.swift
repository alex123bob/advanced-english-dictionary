import SwiftUI

struct ContentView: View {
    @State private var query = ""
    @State private var apiBaseURL = "http://localhost:8000"
    @State private var entry: DictionaryEntry?
    @State private var recentWords: [String] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let api = DictionaryAPI()

    var body: some View {
        NavigationSplitView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Dictionary")
                    .font(.largeTitle.bold())
                TextField("API base URL", text: $apiBaseURL)
                    .textFieldStyle(.roundedBorder)
                Divider()
                Text("Recent")
                    .font(.headline)
                if recentWords.isEmpty {
                    Text("No recent lookups yet.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(recentWords, id: \.self) { word in
                        Button(word) {
                            query = word
                            Task { await search() }
                        }
                        .buttonStyle(.plain)
                    }
                }
                Spacer()
            }
            .padding()
            .navigationSplitViewColumnWidth(min: 220, ideal: 260)
        } detail: {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 10) {
                    TextField("Search a word or phrase", text: $query)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit { Task { await search() } }
                    Button("Look Up") {
                        Task { await search() }
                    }
                    .keyboardShortcut(.return, modifiers: .command)
                }

                if isLoading {
                    ProgressView("Looking up word...")
                } else if let errorMessage {
                    ContentUnavailableView("Lookup Failed", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                } else if let entry {
                    resultView(entry)
                } else {
                    ContentUnavailableView("Start a Search", systemImage: "text.magnifyingglass", description: Text("Look up any English word using the configured dictionary API."))
                }

                Spacer()
            }
            .padding(24)
        }
    }

    @ViewBuilder
    private func resultView(_ entry: DictionaryEntry) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(entry.headword)
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                if let pronunciation = entry.primaryEntry?.pronunciation, !pronunciation.isEmpty {
                    Text(pronunciation)
                        .foregroundStyle(.secondary)
                }
                ForEach(Array(entry.senses.prefix(8).enumerated()), id: \.offset) { index, sense in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("\(index + 1).")
                                .fontWeight(.bold)
                            if let partOfSpeech = sense.partOfSpeech {
                                Text(partOfSpeech)
                                    .font(.caption.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(.blue.opacity(0.12), in: Capsule())
                            }
                        }
                        Text(sense.definition ?? "Definition unavailable in summary.")
                        if let example = sense.example, !example.isEmpty {
                            Text(example)
                                .foregroundStyle(.secondary)
                                .italic()
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }

    private func search() async {
        let word = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !word.isEmpty else { return }

        isLoading = true
        errorMessage = nil

        do {
            let result = try await api.lookup(word: word, apiBaseURL: apiBaseURL)
            entry = result
            recentWords = ([word] + recentWords.filter { $0.caseInsensitiveCompare(word) != .orderedSame }).prefix(10).map { $0 }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
