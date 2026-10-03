part of 'conversations_bloc.dart';

enum ConversationsStatus { initial, loading, loaded }

class ConversationsState extends Equatable {
  final ConversationsStatus status;
  final List<Conversation> conversations;
  final String? selectedPeerId;
  final String search;

  const ConversationsState({this.status = ConversationsStatus.initial, this.conversations = const [], this.selectedPeerId, this.search = ''});

  ConversationsState copyWith({ConversationsStatus? status, List<Conversation>? conversations, String? selectedPeerId, String? search}) {
    return ConversationsState(
      status: status ?? this.status,
      conversations: conversations ?? this.conversations,
      selectedPeerId: selectedPeerId ?? this.selectedPeerId,
      search: search ?? this.search,
    );
  }

  @override
  List<Object?> get props => [status, conversations, selectedPeerId, search];
}
