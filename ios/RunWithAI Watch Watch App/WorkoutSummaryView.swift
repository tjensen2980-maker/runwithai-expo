// WorkoutSummaryView.swift – ios/RunWithAI Watch Watch App
import SwiftUI

struct WorkoutSummaryView: View {
      @ObservedObject var workoutManager = WorkoutManager.shared
      @Environment(\.dismiss) var dismiss
      let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

      var body: some View {
                ScrollView {
                              VStack(spacing: 12) {
                                                VStack(spacing: 4) {
                                                                      Image(systemName: "checkmark.circle.fill").font(.system(size: 32)).foregroundColor(primaryColor)
                                                                      Text("Godt løb!").font(.headline).foregroundColor(.white)
                                                }
                                                HStack(spacing: 16) {
                                                                      summaryStatView(value: workoutManager.formatDistance(workoutManager.distance), unit: "km", color: primaryColor)
                                                                      summaryStatView(value: workoutManager.formatDuration(workoutManager.elapsedSeconds), unit: "tid", color: .white)
                                                }
                                                Divider().background(Color.gray.opacity(0.3))
                                                HStack(spacing: 16) {
                                                                      summaryStatView(value: workoutManager.formatPace(workoutManager.averagePace), unit: "gns. pace", color: .orange)
                                                                      summaryStatView(value: workoutManager.formatHeartRate(), unit: "gns. puls", color: .red)
                                                }
                                                HStack(spacing: 16) {
                                                                      summaryStatView(value: workoutManager.formatCalories(), unit: "kcal", color: .orange)
                                                                      summaryStatView(value: workoutManager.formatCadence(), unit: "spm", color: .cyan)
                                                }
                                                if workoutManager.totalAscent > 0 {
                                                                      HStack(spacing: 16) {
                                                                                                summaryStatView(value: workoutManager.formatElevation(workoutManager.totalAscent), unit: "stigning", color: .green)
                                                                                                summaryStatView(value: workoutManager.formatElevation(workoutManager.totalDescent), unit: "fald", color: .purple)
                                                                      }
                                                }
                                                Divider().background(Color.gray.opacity(0.3))
                                                if !workoutManager.splits.isEmpty {
                                                                      VStack(alignment: .leading, spacing: 4) {
                                                                                                Text("Km Splits").font(.caption).foregroundColor(.gray)
                                                                                                ForEach(workoutManager.splits) { split in splitRow(split: split) }
                                                                      }
                                                }
                                                Button(action: { dismiss() }) {
                                                                      Text("Færdig").frame(maxWidth: .infinity).padding(.vertical, 8)
                                                                          .background(primaryColor).foregroundColor(.white).cornerRadius(10)
                                                }.buttonStyle(PlainButtonStyle()).padding(.top, 8)
                              }.padding(.horizontal, 8).padding(.vertical, 4)
                }.navigationBarBackButtonHidden(true)
      }

      private func summaryStatView(value: String, unit: String, color: Color) -> some View {
                VStack(spacing: 2) {
                              Text(value).font(.system(.title3, design: .rounded)).fontWeight(.bold).foregroundColor(color)
                              Text(unit).font(.caption2).foregroundColor(.gray)
                }.frame(maxWidth: .infinity)
      }

      private func splitRow(split: KmSplit) -> some View {
                let isFastest = workoutManager.fastestSplit()?.km == split.km
                let isSlowest = workoutManager.slowestSplit()?.km == split.km && workoutManager.splits.count > 1
                return HStack {
                              Text("\(split.km) km").font(.caption2).foregroundColor(.gray).frame(width: 36, alignment: .leading)
                              Text(workoutManager.formatPace(split.pace))
                                  .font(.system(.caption, design: .rounded)).fontWeight(.semibold)
                                  .foregroundColor(isFastest ? .green : (isSlowest ? .red : .white))
                              Spacer()
                              if split.heartRate > 0 {
                                                HStack(spacing: 2) {
                                                                      Image(systemName: "heart.fill").font(.system(size: 8)).foregroundColor(.red)
                                                                      Text("\(Int(split.heartRate))").font(.caption2).foregroundColor(.gray)
                                                }
                              }
                              if isFastest { Image(systemName: "bolt.fill").font(.system(size: 8)).foregroundColor(.green) }
                }.padding(.vertical, 2)
      }
}
