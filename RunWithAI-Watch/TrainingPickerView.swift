import SwiftUI

struct TrainingPickerView: View {
      @Binding var selectedPlan: TrainingPlan?
      @Binding var showRunning: Bool
      @Environment(\.dismiss) var dismiss

      let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

      var body: some View {
                ScrollView {
                              VStack(spacing: 10) {
                                                Text("Vælg træning")
                                                    .font(.headline)
                                                    .foregroundColor(.white)
                                                    .padding(.top, 4)

                                                // Free run (always first)
                                                planCard(plan: TrainingPlans.freeRun)

                                                Divider().background(Color.gray.opacity(0.3))

                                                // Categorized plans
                                                ForEach(TrainingCategory.allCases, id: \.rawValue) { category in
                                                                                                                        let plans = TrainingPlans.allPlans.filter { $0.category == category && $0.name != "Frit løb" }
                                                                                                                        if !plans.isEmpty {
                                                                                                                                                  VStack(alignment: .leading, spacing: 6) {
                                                                                                                                                                                HStack(spacing: 4) {
                                                                                                                                                                                                                  Image(systemName: category.icon)
                                                                                                                                                                                                                      .font(.caption2)
                                                                                                                                                                                                                      .foregroundColor(.gray)
                                                                                                                                                                                                                  Text(category.rawValue)
                                                                                                                                                                                                                      .font(.caption)
                                                                                                                                                                                                                      .foregroundColor(.gray)
                                                                                                                                                                                                              }
                                                                                                                                                                                .padding(.leading, 4)
                                                                                                                                                                                
                                                                                                                                                                                ForEach(plans) { plan in
                                                                                                                                                                                                                                planCard(plan: plan)
                                                                                                                                                                                                                            }
                                                                                                                                                  }
                                                                                                                        }
                                                                                                   }
                              }
                              .padding(.horizontal, 4)
                }
      }

      // MARK: - Plan Card
      private func planCard(plan: TrainingPlan) -> some View {
                Button(action: {
                              selectedPlan = plan
                              showRunning = true
                }) {
                              HStack(spacing: 8) {
                                                // Icon
                                                Image(systemName: plan.icon)
                                                    .font(.body)
                                                    .foregroundColor(plan.color)
                                                    .frame(width: 28, height: 28)
                                                    .background(plan.color.opacity(0.2))
                                                    .clipShape(Circle())

                                                // Info
                                                VStack(alignment: .leading, spacing: 2) {
                                                                      Text(plan.name)
                                                                          .font(.system(.caption, design: .rounded))
                                                                          .fontWeight(.semibold)
                                                                          .foregroundColor(.white)

                                                                      Text(plan.description)
                                                                          .font(.system(size: 10))
                                                                          .foregroundColor(.gray)
                                                                          .lineLimit(1)
                                                }

                                                Spacer()

                                                // Duration & difficulty
                                                VStack(alignment: .trailing, spacing: 2) {
                                                                      if plan.estimatedMinutes > 0 {
                                                                                                Text("\(plan.estimatedMinutes)m")
                                                                                                    .font(.system(size: 10, design: .rounded))
                                                                                                    .foregroundColor(.gray)
                                                                      }
                                                                      if plan.difficulty > 0 {
                                                                                                HStack(spacing: 1) {
                                                                                                                              ForEach(0..<plan.difficulty, id: \.self) { _ in
                                                                                                                                                                                                        Circle()
                                                                                                                                                                                                            .fill(plan.color)
                                                                                                                                                                                                            .frame(width: 4, height: 4)
                                                                                                                                                                       }
                                                                                                }
                                                                      }
                                                }
                              }
                              .padding(.vertical, 6)
                              .padding(.horizontal, 8)
                              .background(Color.white.opacity(0.05))
                              .cornerRadius(10)
                }
                .buttonStyle(PlainButtonStyle())
      }
}

// MARK: - Training Detail Preview
struct TrainingDetailView: View {
      let plan: TrainingPlan
      @Binding var showRunning: Bool

      let primaryColor = Color(red: 0.3, green: 0.7, blue: 0.4)

      var body: some View {
                ScrollView {
                              VStack(spacing: 8) {
                                                // Header
                                                Image(systemName: plan.icon)
                                                    .font(.title2)
                                                    .foregroundColor(plan.color)

                                                Text(plan.name)
                                                    .font(.headline)
                                                    .foregroundColor(.white)

                                                // Intervals preview
                                                if !plan.intervals.isEmpty {
                                                                      VStack(spacing: 4) {
                                                                                                ForEach(plan.intervals) { interval in
                                                                                                                                                     HStack {
                                                                                                                                                                                       Image(systemName: interval.type.icon)
                                                                                                                                                                                           .font(.system(size: 10))
                                                                                                                                                                                           .foregroundColor(interval.type.color)
                                                                                                                                                                                           .frame(width: 14)
                                                                                                                                                                                       
                                                                                                                                                                                       Text(interval.type.rawValue)
                                                                                                                                                                                           .font(.caption2)
                                                                                                                                                                                           .foregroundColor(.white)
                                                                                                                                                                                       
                                                                                                                                                                                       Spacer()
                                                                                                                                                                                       
                                                                                                                                                                                       if interval.repeatCount > 1 {
                                                                                                                                                                                                                             Text("\(interval.repeatCount)x")
                                                                                                                                                                                                                                 .font(.system(size: 10, weight: .bold))
                                                                                                                                                                                                                                 .foregroundColor(interval.type.color)
                                                                                                                                                                                                                         }
                                                                                                                                                                                       
                                                                                                                                                                                       Text(interval.displayDuration)
                                                                                                                                                                                           .font(.system(size: 10, design: .rounded))
                                                                                                                                                                                           .foregroundColor(.gray)
                                                                                                                                                     }
                                                                                                                        }
                                                                      }
                                                                      .padding(8)
                                                                      .background(Color.white.opacity(0.05))
                                                                      .cornerRadius(8)
                                                }

                                                // Start button
                                                Button(action: { showRunning = true }) {
                                                                      HStack {
                                                                                                Image(systemName: "play.fill")
                                                                                                Text("Start")
                                                                      }
                                                                      .frame(maxWidth: .infinity)
                                                                      .padding(.vertical, 8)
                                                                      .background(primaryColor)
                                                                      .foregroundColor(.white)
                                                                      .cornerRadius(10)
                                                }
                                                .buttonStyle(PlainButtonStyle())
                                                .padding(.top, 4)
                              }
                              .padding(.horizontal, 8)
                }
      }
}
