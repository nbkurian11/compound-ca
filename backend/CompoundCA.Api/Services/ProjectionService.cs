using CompoundCA.Api.Models;

namespace CompoundCA.Api.Services;

public sealed class ProjectionService
{
    public ProjectionResponse Calculate(ProjectionRequest request)
    {
        var taxableRate = Math.Max(0, request.Rate - 2);
        var tfsa = CalculateAccount(request.Starting, request.Monthly, request.Rate, request.Years);
        var taxable = CalculateAccount(request.Starting, request.Monthly, taxableRate, request.Years);
        var labels = Enumerable.Range(0, request.Years + 1)
            .Select(year => year == 0 ? "Today" : $"Year {year}").ToArray();

        // RRSP currently models tax-deferred growth only, using the same return as TFSA.
        return new ProjectionResponse(request.Account, request.Years, request.Rate, taxableRate,
            tfsa, taxable, request.Account == "Taxable" ? taxable : tfsa, labels);
    }

    private static AccountProjection CalculateAccount(double starting, double monthly, double annualRate, int years)
    {
        var value = starting;
        var values = new List<double> { value };
        var months = years * 12;

        for (var month = 1; month <= months; month++)
        {
            value = value * (1 + annualRate / 100 / 12) + monthly;
            if (month % 12 == 0) values.Add(value);
        }

        return new AccountProjection(value, values.ToArray(), starting + monthly * months);
    }
}
