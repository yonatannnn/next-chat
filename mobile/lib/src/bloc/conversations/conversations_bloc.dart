import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../services/chat_repository.dart';
import '../../services/users_repository.dart';

part 'conversations_event.dart';
part 'conversations_state.dart';

class ConversationsBloc extends Bloc<ConversationsEvent, ConversationsState> {
  final ChatRepository chatRepository;
  final UsersRepository usersRepository;
  final String currentUserId;

  ConversationsBloc({required this.chatRepository, required this.usersRepository, required this.currentUserId})
      : super(const ConversationsState()) {
    on<ConversationsStarted>(_onStarted);
    on<ConversationSelected>(_onSelected);
    on<SearchChanged>(_onSearchChanged);
    on<ConversationsUpdated>(_onUpdated);
  }

  Future<void> _onStarted(ConversationsStarted event, Emitter<ConversationsState> emit) async {
    emit(state.copyWith(status: ConversationsStatus.loading));
    final stream = chatRepository
        .subscribeToConversations(currentUserId: currentUserId)
        .asyncMap((items) async {
      // Prefetch usernames to avoid showing raw IDs
      final peerIds = items.map((c) => c.peerId).toSet();
      final futures = <Future<void>>[];
      for (final id in peerIds) {
        if (!usersRepository.hasCached(id)) {
          futures.add(usersRepository.getProfile(id).then((_) {}));
        }
      }
      if (futures.isNotEmpty) {
        await Future.wait(futures);
      }
      return items;
    });

    await emit.forEach<List<Conversation>>(
      stream,
      onData: (items) => state.copyWith(status: ConversationsStatus.loaded, conversations: items),
    );
  }

  void _onSelected(ConversationSelected event, Emitter<ConversationsState> emit) {
    emit(state.copyWith(selectedPeerId: event.peerId));
  }

  void _onSearchChanged(SearchChanged event, Emitter<ConversationsState> emit) {
    emit(state.copyWith(search: event.query));
  }

  void _onUpdated(ConversationsUpdated event, Emitter<ConversationsState> emit) {
    emit(state.copyWith(conversations: event.items, status: ConversationsStatus.loaded));
  }

  // Expose a helper for server-side user search akin to web logic
  Future<List<UserProfile>> searchDirectory(String query) {
    return usersRepository.searchExactUsername(query, currentUserId);
  }
}
