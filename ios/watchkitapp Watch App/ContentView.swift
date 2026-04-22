import SwiftUI

struct ContentView: View {
    @StateObject private var workout = WorkoutManager()

    var body: some View {
        VStack(spacing: 12) {
            Text("RunWithAI")
                .font(.headline)
                .foregroundColor(.orange)

            Text(workout.formattedTime)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundColor(.white)

            if !workout.isRunning {
                Button(action: { workout.start() }) {
                    Text("Start")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .tint(.green)
            } else {
                HStack(spacing: 8) {
                    if workout.isPaused {
                        Button(action: { workout.resume() }) {
                            Text("Fortsaet")
                        }
                        .tint(.green)
                    } else {
                        Button(action: { workout.pause() }) {
                            Text("Pause")
                        }
                        .tint(.yellow)
                    }

                    Button(action: { workout.stop() }) {
                        Text("Stop")
                    }
                    .tint(.red)
                }
            }
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
