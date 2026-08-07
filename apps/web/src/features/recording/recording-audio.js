export function attachRecordingAudio(state, stream, video, AudioContextCtor) {
  if (!AudioContextCtor || !video) return false;
  try {
    const audioContext = new AudioContextCtor();
    const sourceNode = audioContext.createMediaElementSource(video);
    const gainNode = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();
    gainNode.gain.value = 0;
    sourceNode.connect(gainNode);
    gainNode.connect(destination);
    sourceNode.connect(audioContext.destination);
    const audioTracks = destination.stream.getAudioTracks();
    if (!audioTracks.length) throw new Error('未获取音频轨道');
    audioTracks.forEach(track => stream.addTrack(track));
    state.audioContext = audioContext;
    state.audioSourceNode = sourceNode;
    state.audioGainNode = gainNode;
    state.audioDestination = destination;
    return true;
  } catch (error) {
    releaseRecordingAudio(state);
    return false;
  }
}

export async function unmuteRecordingAudio(state) {
  const { audioContext, audioGainNode } = state;
  if (!audioGainNode) return;
  if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
  audioGainNode.gain.value = 1;
}

export function releaseRecordingAudio(state) {
  const { audioContext, audioSourceNode, audioGainNode } = state;
  try {
    if (audioSourceNode) audioSourceNode.disconnect();
    if (audioGainNode) audioGainNode.disconnect();
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
  } finally {
    state.audioContext = null;
    state.audioSourceNode = null;
    state.audioGainNode = null;
    state.audioDestination = null;
  }
}
