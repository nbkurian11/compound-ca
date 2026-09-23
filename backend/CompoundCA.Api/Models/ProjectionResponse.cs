namespace CompoundCA.Api.Models;

public sealed record AccountProjection(double Value, double[] Values, double Contributed);

public sealed record ProjectionResponse(
    string Account,
    int Years,
    double NominalRate,
    double TaxableRate,
    AccountProjection Tfsa,
    AccountProjection Taxable,
    AccountProjection Selected,
    string[] Labels);
